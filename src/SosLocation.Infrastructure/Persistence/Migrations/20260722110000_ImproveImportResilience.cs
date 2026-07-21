using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SosLocation.Infrastructure.Persistence.Migrations;

[DbContext(typeof(SosDbContext))]
[Migration("20260722110000_ImproveImportResilience")]
public partial class ImproveImportResilience : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "next_attempt_at",
            table: "import_jobs",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_dataset_versions_dataset_id_checksum",
            table: "dataset_versions",
            columns: ["dataset_id", "checksum"],
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_import_jobs_status_next_attempt_at",
            table: "import_jobs",
            columns: ["status", "next_attempt_at"]);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_dataset_versions_dataset_id_checksum",
            table: "dataset_versions");

        migrationBuilder.DropIndex(
            name: "IX_import_jobs_status_next_attempt_at",
            table: "import_jobs");

        migrationBuilder.DropColumn(
            name: "next_attempt_at",
            table: "import_jobs");
    }
}
