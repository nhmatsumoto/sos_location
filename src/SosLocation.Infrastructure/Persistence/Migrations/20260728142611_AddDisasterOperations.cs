using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace SosLocation.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDisasterOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "disaster_scenarios",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    scenario_key = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    hazard_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    canonical_event_id = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    simulation_clock_origin = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    epicenter = table.Column<Point>(type: "geometry", nullable: true),
                    depth_km = table.Column<double>(type: "double precision", nullable: true),
                    moment_magnitude = table.Column<double>(type: "double precision", nullable: true),
                    magnitude_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_disaster_scenarios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "operational_map_features",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    disaster_scenario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    feature_type = table.Column<string>(type: "character varying(96)", maxLength: 96, nullable: false),
                    name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    geometry = table.Column<Geometry>(type: "geometry", nullable: false),
                    properties = table.Column<string>(type: "jsonb", nullable: true),
                    verification_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    effective_from = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    effective_to = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operational_map_features", x => x.id);
                    table.ForeignKey(
                        name: "FK_operational_map_features_disaster_scenarios_disaster_scenar~",
                        column: x => x.disaster_scenario_id,
                        principalTable: "disaster_scenarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "source_observations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    disaster_scenario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_id = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    source_url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    kind = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    payload = table.Column<string>(type: "jsonb", nullable: false),
                    payload_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    observed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    captured_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    verification_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_source_observations", x => x.id);
                    table.ForeignKey(
                        name: "FK_source_observations_disaster_scenarios_disaster_scenario_id",
                        column: x => x.disaster_scenario_id,
                        principalTable: "disaster_scenarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "impact_observations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    disaster_scenario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_observation_id = table.Column<Guid>(type: "uuid", nullable: true),
                    previous_observation_id = table.Column<Guid>(type: "uuid", nullable: true),
                    kind = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    subject = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    value = table.Column<string>(type: "jsonb", nullable: false),
                    observed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    captured_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    confidence = table.Column<double>(type: "double precision", nullable: false),
                    verification_status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_impact_observations", x => x.id);
                    table.ForeignKey(
                        name: "FK_impact_observations_disaster_scenarios_disaster_scenario_id",
                        column: x => x.disaster_scenario_id,
                        principalTable: "disaster_scenarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_impact_observations_impact_observations_previous_observatio~",
                        column: x => x.previous_observation_id,
                        principalTable: "impact_observations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_impact_observations_source_observations_source_observation_~",
                        column: x => x.source_observation_id,
                        principalTable: "source_observations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_disaster_scenarios_canonical_event_id",
                table: "disaster_scenarios",
                column: "canonical_event_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_disaster_scenarios_epicenter",
                table: "disaster_scenarios",
                column: "epicenter")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_disaster_scenarios_scenario_key",
                table: "disaster_scenarios",
                column: "scenario_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_impact_observations_disaster_scenario_id_observed_at",
                table: "impact_observations",
                columns: new[] { "disaster_scenario_id", "observed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_impact_observations_previous_observation_id",
                table: "impact_observations",
                column: "previous_observation_id");

            migrationBuilder.CreateIndex(
                name: "IX_impact_observations_source_observation_id",
                table: "impact_observations",
                column: "source_observation_id");

            migrationBuilder.CreateIndex(
                name: "IX_operational_map_features_disaster_scenario_id_feature_type",
                table: "operational_map_features",
                columns: new[] { "disaster_scenario_id", "feature_type" });

            migrationBuilder.CreateIndex(
                name: "IX_operational_map_features_geometry",
                table: "operational_map_features",
                column: "geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_source_observations_disaster_scenario_id_captured_at",
                table: "source_observations",
                columns: new[] { "disaster_scenario_id", "captured_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "impact_observations");

            migrationBuilder.DropTable(
                name: "operational_map_features");

            migrationBuilder.DropTable(
                name: "source_observations");

            migrationBuilder.DropTable(
                name: "disaster_scenarios");
        }
    }
}
