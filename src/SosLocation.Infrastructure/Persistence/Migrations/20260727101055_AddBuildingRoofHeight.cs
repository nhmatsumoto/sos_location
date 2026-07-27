using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SosLocation.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBuildingRoofHeight : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "roof_height_m",
                table: "buildings",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "roof_height_m",
                table: "buildings");
        }
    }
}
