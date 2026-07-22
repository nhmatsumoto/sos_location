using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SosLocation.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDatasetSourceMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_statistical",
                table: "datasets",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "source_key",
                table: "datasets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "source_priority",
                table: "datasets",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_statistical",
                table: "datasets");

            migrationBuilder.DropColumn(
                name: "source_key",
                table: "datasets");

            migrationBuilder.DropColumn(
                name: "source_priority",
                table: "datasets");
        }
    }
}
