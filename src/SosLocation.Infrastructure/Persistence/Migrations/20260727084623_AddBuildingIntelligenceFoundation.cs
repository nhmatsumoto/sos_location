using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace SosLocation.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBuildingIntelligenceFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "building_footprints",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    geometry = table.Column<Geometry>(type: "geometry", nullable: false),
                    source_of_truth = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    valid_from = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    valid_to = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    revision = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_building_footprints", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "building_observations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    dataset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    source_reference = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    captured_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ingested_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    geometry = table.Column<Geometry>(type: "geometry", nullable: false),
                    raster_asset_uri = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: true),
                    spatial_reference_id = table.Column<int>(type: "integer", nullable: false),
                    license_id = table.Column<Guid>(type: "uuid", nullable: true),
                    metadata_json = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_building_observations", x => x.id);
                    table.ForeignKey(
                        name: "FK_building_observations_datasets_dataset_id",
                        column: x => x.dataset_id,
                        principalTable: "datasets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "model_bundles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    version = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    stage = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    artifact_uri = table.Column<string>(type: "character varying(1024)", maxLength: 1024, nullable: false),
                    training_dataset_id = table.Column<Guid>(type: "uuid", nullable: true),
                    metrics_json = table.Column<string>(type: "jsonb", nullable: true),
                    configuration_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    approved_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    approved_by = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_model_bundles", x => x.id);
                    table.ForeignKey(
                        name: "FK_model_bundles_datasets_training_dataset_id",
                        column: x => x.training_dataset_id,
                        principalTable: "datasets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "building_footprint_candidates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    observation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    geometry = table.Column<Geometry>(type: "geometry", nullable: false),
                    area_m2 = table.Column<double>(type: "double precision", nullable: false),
                    perimeter_m = table.Column<double>(type: "double precision", nullable: false),
                    model_name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    model_version = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    uncertainty = table.Column<double>(type: "double precision", nullable: true),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_building_footprint_candidates", x => x.id);
                    table.ForeignKey(
                        name: "FK_building_footprint_candidates_building_observations_observa~",
                        column: x => x.observation_id,
                        principalTable: "building_observations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "building_classifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    building_id = table.Column<Guid>(type: "uuid", nullable: true),
                    candidate_id = table.Column<Guid>(type: "uuid", nullable: true),
                    building_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    probability = table.Column<double>(type: "double precision", nullable: false),
                    estimated_levels = table.Column<int>(type: "integer", nullable: true),
                    estimated_height_m = table.Column<double>(type: "double precision", nullable: true),
                    model_name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    model_version = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_building_classifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_building_classifications_building_footprint_candidates_cand~",
                        column: x => x.candidate_id,
                        principalTable: "building_footprint_candidates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_building_classifications_building_footprints_building_id",
                        column: x => x.building_id,
                        principalTable: "building_footprints",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "building_reconciliations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    candidate_id = table.Column<Guid>(type: "uuid", nullable: false),
                    existing_building_id = table.Column<Guid>(type: "uuid", nullable: true),
                    intersection_over_union = table.Column<double>(type: "double precision", nullable: false),
                    centroid_distance_m = table.Column<double>(type: "double precision", nullable: true),
                    area_difference_ratio = table.Column<double>(type: "double precision", nullable: true),
                    change_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    decision = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_building_reconciliations", x => x.id);
                    table.ForeignKey(
                        name: "FK_building_reconciliations_building_footprint_candidates_cand~",
                        column: x => x.candidate_id,
                        principalTable: "building_footprint_candidates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_building_reconciliations_building_footprints_existing_build~",
                        column: x => x.existing_building_id,
                        principalTable: "building_footprints",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "building_validations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    candidate_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reviewer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    decision = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    corrected_geometry = table.Column<Geometry>(type: "geometry", nullable: true),
                    corrected_building_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    reason = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_building_validations", x => x.id);
                    table.ForeignKey(
                        name: "FK_building_validations_building_footprint_candidates_candidat~",
                        column: x => x.candidate_id,
                        principalTable: "building_footprint_candidates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_building_classifications_building_id",
                table: "building_classifications",
                column: "building_id");

            migrationBuilder.CreateIndex(
                name: "IX_building_classifications_candidate_id",
                table: "building_classifications",
                column: "candidate_id");

            migrationBuilder.CreateIndex(
                name: "IX_building_footprint_candidates_geometry",
                table: "building_footprint_candidates",
                column: "geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_building_footprint_candidates_observation_id",
                table: "building_footprint_candidates",
                column: "observation_id");

            migrationBuilder.CreateIndex(
                name: "IX_building_footprint_candidates_status",
                table: "building_footprint_candidates",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_building_footprints_geometry",
                table: "building_footprints",
                column: "geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_building_footprints_status",
                table: "building_footprints",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_building_observations_dataset_id",
                table: "building_observations",
                column: "dataset_id");

            migrationBuilder.CreateIndex(
                name: "IX_building_observations_geometry",
                table: "building_observations",
                column: "geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_building_reconciliations_candidate_id",
                table: "building_reconciliations",
                column: "candidate_id");

            migrationBuilder.CreateIndex(
                name: "IX_building_reconciliations_existing_building_id",
                table: "building_reconciliations",
                column: "existing_building_id");

            migrationBuilder.CreateIndex(
                name: "IX_building_validations_candidate_id",
                table: "building_validations",
                column: "candidate_id");

            migrationBuilder.CreateIndex(
                name: "IX_building_validations_corrected_geometry",
                table: "building_validations",
                column: "corrected_geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_building_validations_reviewer_id",
                table: "building_validations",
                column: "reviewer_id");

            migrationBuilder.CreateIndex(
                name: "IX_model_bundles_name_version",
                table: "model_bundles",
                columns: new[] { "name", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_model_bundles_stage",
                table: "model_bundles",
                column: "stage");

            migrationBuilder.CreateIndex(
                name: "IX_model_bundles_training_dataset_id",
                table: "model_bundles",
                column: "training_dataset_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "building_classifications");

            migrationBuilder.DropTable(
                name: "building_reconciliations");

            migrationBuilder.DropTable(
                name: "building_validations");

            migrationBuilder.DropTable(
                name: "model_bundles");

            migrationBuilder.DropTable(
                name: "building_footprints");

            migrationBuilder.DropTable(
                name: "building_footprint_candidates");

            migrationBuilder.DropTable(
                name: "building_observations");
        }
    }
}
