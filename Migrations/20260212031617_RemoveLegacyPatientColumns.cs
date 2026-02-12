using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyPatientColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExternalRecord",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "ExternalRecordPdfUrl",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "ObstetricData",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "ObstetricDataFileUrl",
                table: "Patients");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalRecord",
                table: "Patients",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalRecordPdfUrl",
                table: "Patients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ObstetricData",
                table: "Patients",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ObstetricDataFileUrl",
                table: "Patients",
                type: "text",
                nullable: true);
        }
    }
}
