using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace SosLocation.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.CreateTable(
                name: "cities",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    country_code = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true),
                    region = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    slug = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    boundary = table.Column<Geometry>(type: "geometry", nullable: true),
                    centroid = table.Column<Point>(type: "geometry", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cities", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "datasets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    provider = table.Column<string>(type: "text", nullable: false),
                    dataset_type = table.Column<string>(type: "text", nullable: false),
                    license = table.Column<string>(type: "text", nullable: false),
                    attribution = table.Column<string>(type: "text", nullable: false),
                    license_uri = table.Column<string>(type: "text", nullable: true),
                    source_uri = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_datasets", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "import_jobs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    city_id = table.Column<Guid>(type: "uuid", nullable: true),
                    city_revision_id = table.Column<Guid>(type: "uuid", nullable: true),
                    job_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    progress = table.Column<int>(type: "integer", nullable: false),
                    current_stage = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    stage_message = table.Column<string>(type: "text", nullable: true),
                    request = table.Column<string>(type: "jsonb", nullable: false),
                    error = table.Column<string>(type: "text", nullable: true),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    worker_id = table.Column<string>(type: "text", nullable: true),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_import_jobs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "city_revisions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    city_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision_number = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    reconstruction_profile = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    spatial_coverage = table.Column<Geometry>(type: "geometry", nullable: true),
                    source_summary = table.Column<string>(type: "jsonb", nullable: true),
                    quality_level = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    published_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_city_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_city_revisions_cities_city_id",
                        column: x => x.city_id,
                        principalTable: "cities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dataset_versions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    dataset_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version = table.Column<string>(type: "text", nullable: false),
                    checksum = table.Column<string>(type: "text", nullable: true),
                    captured_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    valid_from = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    valid_to = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    storage_key = table.Column<string>(type: "text", nullable: true),
                    metadata = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dataset_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_dataset_versions_datasets_dataset_id",
                        column: x => x.dataset_id,
                        principalTable: "datasets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "processing_issues",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    job_id = table.Column<Guid>(type: "uuid", nullable: false),
                    feature_id = table.Column<string>(type: "text", nullable: true),
                    severity = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    code = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    details = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_processing_issues", x => x.id);
                    table.ForeignKey(
                        name: "FK_processing_issues_import_jobs_job_id",
                        column: x => x.job_id,
                        principalTable: "import_jobs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "buildings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    city_revision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    footprint = table.Column<Geometry>(type: "geometry", nullable: false),
                    centroid = table.Column<Point>(type: "geometry", nullable: false),
                    height_m = table.Column<double>(type: "double precision", nullable: false),
                    min_height_m = table.Column<double>(type: "double precision", nullable: false),
                    ground_elevation_m = table.Column<double>(type: "double precision", nullable: false),
                    building_levels = table.Column<int>(type: "integer", nullable: true),
                    roof_levels = table.Column<int>(type: "integer", nullable: true),
                    building_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    roof_shape = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    height_source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tags = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_buildings", x => x.id);
                    table.ForeignKey(
                        name: "FK_buildings_city_revisions_city_revision_id",
                        column: x => x.city_revision_id,
                        principalTable: "city_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "land_use_areas",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    city_revision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    geometry = table.Column<Geometry>(type: "geometry", nullable: false),
                    land_use_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tags = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_land_use_areas", x => x.id);
                    table.ForeignKey(
                        name: "FK_land_use_areas_city_revisions_city_revision_id",
                        column: x => x.city_revision_id,
                        principalTable: "city_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "roads",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    city_revision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    geometry = table.Column<Geometry>(type: "geometry", nullable: false),
                    road_class = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    width_m = table.Column<double>(type: "double precision", nullable: true),
                    lanes = table.Column<int>(type: "integer", nullable: true),
                    is_bridge = table.Column<bool>(type: "boolean", nullable: false),
                    is_tunnel = table.Column<bool>(type: "boolean", nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tags = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roads", x => x.id);
                    table.ForeignKey(
                        name: "FK_roads_city_revisions_city_revision_id",
                        column: x => x.city_revision_id,
                        principalTable: "city_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "water_features",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    city_revision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    external_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    geometry = table.Column<Geometry>(type: "geometry", nullable: false),
                    water_type = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    source_dataset_version_id = table.Column<Guid>(type: "uuid", nullable: true),
                    tags = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_water_features", x => x.id);
                    table.ForeignKey(
                        name: "FK_water_features_city_revisions_city_revision_id",
                        column: x => x.city_revision_id,
                        principalTable: "city_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_buildings_city_revision_id",
                table: "buildings",
                column: "city_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_buildings_city_revision_id_external_id",
                table: "buildings",
                columns: new[] { "city_revision_id", "external_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_buildings_footprint",
                table: "buildings",
                column: "footprint")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_cities_boundary",
                table: "cities",
                column: "boundary")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_cities_slug",
                table: "cities",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_city_revisions_city_id",
                table: "city_revisions",
                column: "city_id");

            migrationBuilder.CreateIndex(
                name: "IX_city_revisions_city_id_revision_number",
                table: "city_revisions",
                columns: new[] { "city_id", "revision_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_city_revisions_spatial_coverage",
                table: "city_revisions",
                column: "spatial_coverage")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_city_revisions_status",
                table: "city_revisions",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_dataset_versions_dataset_id",
                table: "dataset_versions",
                column: "dataset_id");

            migrationBuilder.CreateIndex(
                name: "IX_datasets_name",
                table: "datasets",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_import_jobs_created_at",
                table: "import_jobs",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_import_jobs_status",
                table: "import_jobs",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_land_use_areas_city_revision_id",
                table: "land_use_areas",
                column: "city_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_land_use_areas_city_revision_id_external_id",
                table: "land_use_areas",
                columns: new[] { "city_revision_id", "external_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_land_use_areas_geometry",
                table: "land_use_areas",
                column: "geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_processing_issues_job_id",
                table: "processing_issues",
                column: "job_id");

            migrationBuilder.CreateIndex(
                name: "IX_roads_city_revision_id",
                table: "roads",
                column: "city_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_roads_city_revision_id_external_id",
                table: "roads",
                columns: new[] { "city_revision_id", "external_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_roads_geometry",
                table: "roads",
                column: "geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_water_features_city_revision_id",
                table: "water_features",
                column: "city_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_water_features_city_revision_id_external_id",
                table: "water_features",
                columns: new[] { "city_revision_id", "external_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_water_features_geometry",
                table: "water_features",
                column: "geometry")
                .Annotation("Npgsql:IndexMethod", "gist");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "buildings");

            migrationBuilder.DropTable(
                name: "dataset_versions");

            migrationBuilder.DropTable(
                name: "land_use_areas");

            migrationBuilder.DropTable(
                name: "processing_issues");

            migrationBuilder.DropTable(
                name: "roads");

            migrationBuilder.DropTable(
                name: "water_features");

            migrationBuilder.DropTable(
                name: "datasets");

            migrationBuilder.DropTable(
                name: "import_jobs");

            migrationBuilder.DropTable(
                name: "city_revisions");

            migrationBuilder.DropTable(
                name: "cities");
        }
    }
}
