#!/usr/bin/env bash
set -euo pipefail

# Helper functions for GitHub Projects v2 GraphQL operations.
# Expects gh + jq and REPO_OWNER/REPO_NAME env vars.

: "${REPO_OWNER:?REPO_OWNER is required}"
: "${REPO_NAME:?REPO_NAME is required}"

gh_graphql() {
  local query="$1"
  local vars_json="${2:-{}}"
  gh api graphql -f query="$query" -f variables="$vars_json"
}

gh_get_owner_and_repo_ids() {
  local q='query($owner:String!, $repo:String!){ repository(owner:$owner, name:$repo){ id owner{ __typename login ... on User { id } ... on Organization { id } } } }'
  local vars
  vars=$(jq -nc --arg owner "$REPO_OWNER" --arg repo "$REPO_NAME" '{owner:$owner, repo:$repo}')
  gh_graphql "$q" "$vars"
}

gh_find_project_v2_by_title() {
  local title="$1"
  local q='query($login:String!){ user(login:$login){ projectsV2(first:100){ nodes{ id title number } } } organization(login:$login){ projectsV2(first:100){ nodes{ id title number } } } }'
  local vars
  vars=$(jq -nc --arg login "$REPO_OWNER" '{login:$login}')
  gh_graphql "$q" "$vars" | jq -r --arg title "$title" '
    [(.data.user.projectsV2.nodes // []), (.data.organization.projectsV2.nodes // [])] | add | map(select(.title==$title)) | first // empty'
}

gh_create_project_v2() {
  local owner_id="$1"
  local title="$2"
  local q='mutation($ownerId:ID!, $title:String!){ createProjectV2(input:{ownerId:$ownerId, title:$title}){ projectV2{ id title number url } } }'
  local vars
  vars=$(jq -nc --arg ownerId "$owner_id" --arg title "$title" '{ownerId:$ownerId, title:$title}')
  gh_graphql "$q" "$vars"
}

gh_get_project_fields() {
  local project_id="$1"
  local q='query($projectId:ID!){ node(id:$projectId){ ... on ProjectV2{ fields(first:100){ nodes{ ... on ProjectV2FieldCommon { id name dataType } ... on ProjectV2SingleSelectField { id name dataType options { id name } } } } } } }'
  local vars
  vars=$(jq -nc --arg projectId "$project_id" '{projectId:$projectId}')
  gh_graphql "$q" "$vars"
}

gh_create_single_select_field() {
  local project_id="$1"
  local name="$2"
  shift 2
  local options=()
  for opt in "$@"; do
    options+=("{name:\"$opt\",description:\"\"}")
  done
  local opts_joined
  opts_joined=$(IFS=,; echo "${options[*]}")
  local q="mutation { createProjectV2Field(input:{projectId:\"$project_id\", dataType:SINGLE_SELECT, name:\"$name\", singleSelectOptions:[$opts_joined]}){ projectV2Field { ... on ProjectV2SingleSelectField { id name } } } }"
  gh api graphql -f query="$q"
}

