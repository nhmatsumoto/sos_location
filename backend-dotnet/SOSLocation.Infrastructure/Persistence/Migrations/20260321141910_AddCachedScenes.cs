using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SOSLocation.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCachedScenes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CachedScenes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MinLat = table.Column<double>(type: "double precision", nullable: false),
                    MinLon = table.Column<double>(type: "double precision", nullable: false),
                    MaxLat = table.Column<double>(type: "double precision", nullable: false),
                    MaxLon = table.Column<double>(type: "double precision", nullable: false),
                    DemResolution = table.Column<int>(type: "integer", nullable: false),
                    SceneDataJson = table.Column<string>(type: "text", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CachedScenes", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CachedScenes");
        }
    }
}
