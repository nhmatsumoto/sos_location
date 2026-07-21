using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SosLocation.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSeismicSimulation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "simulation_runs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    city_revision_id = table.Column<Guid>(type: "uuid", nullable: false),
                    disaster_type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    progress = table.Column<int>(type: "integer", nullable: false),
                    current_stage = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    stage_message = table.Column<string>(type: "text", nullable: true),
                    parameters = table.Column<string>(type: "jsonb", nullable: false),
                    error = table.Column<string>(type: "text", nullable: true),
                    attempts = table.Column<int>(type: "integer", nullable: false),
                    worker_id = table.Column<string>(type: "text", nullable: true),
                    started_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    intensity_west = table.Column<double>(type: "double precision", nullable: true),
                    intensity_south = table.Column<double>(type: "double precision", nullable: true),
                    intensity_east = table.Column<double>(type: "double precision", nullable: true),
                    intensity_north = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_simulation_runs", x => x.id);
                    table.ForeignKey(
                        name: "FK_simulation_runs_city_revisions_city_revision_id",
                        column: x => x.city_revision_id,
                        principalTable: "city_revisions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "building_seismic_responses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    simulation_run_id = table.Column<Guid>(type: "uuid", nullable: false),
                    building_id = table.Column<Guid>(type: "uuid", nullable: false),
                    natural_period_seconds = table.Column<double>(type: "double precision", nullable: false),
                    peak_ground_acceleration_g = table.Column<double>(type: "double precision", nullable: false),
                    peak_ground_velocity_cms = table.Column<double>(type: "double precision", nullable: false),
                    spectral_acceleration_g = table.Column<double>(type: "double precision", nullable: false),
                    peak_drift_ratio = table.Column<double>(type: "double precision", nullable: false),
                    damage_state = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_building_seismic_responses", x => x.id);
                    table.ForeignKey(
                        name: "FK_building_seismic_responses_buildings_building_id",
                        column: x => x.building_id,
                        principalTable: "buildings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_building_seismic_responses_simulation_runs_simulation_run_id",
                        column: x => x.simulation_run_id,
                        principalTable: "simulation_runs",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_building_seismic_responses_building_id",
                table: "building_seismic_responses",
                column: "building_id");

            migrationBuilder.CreateIndex(
                name: "IX_building_seismic_responses_simulation_run_id",
                table: "building_seismic_responses",
                column: "simulation_run_id");

            migrationBuilder.CreateIndex(
                name: "IX_building_seismic_responses_simulation_run_id_building_id",
                table: "building_seismic_responses",
                columns: new[] { "simulation_run_id", "building_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_simulation_runs_city_revision_id",
                table: "simulation_runs",
                column: "city_revision_id");

            migrationBuilder.CreateIndex(
                name: "IX_simulation_runs_created_at",
                table: "simulation_runs",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "IX_simulation_runs_status",
                table: "simulation_runs",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "building_seismic_responses");

            migrationBuilder.DropTable(
                name: "simulation_runs");
        }
    }
}
