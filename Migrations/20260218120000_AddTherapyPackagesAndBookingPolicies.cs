using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    /// <inheritdoc />
    public partial class AddTherapyPackagesAndBookingPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Holidays",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PsychologistId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Description = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Holidays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Holidays_Psychologists_PsychologistId",
                        column: x => x.PsychologistId,
                        principalTable: "Psychologists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TherapyPackages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    TotalSessions = table.Column<int>(type: "integer", nullable: false),
                    UsedSessions = table.Column<int>(type: "integer", nullable: false),
                    BillingCycle = table.Column<int>(type: "integer", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RolloverPolicy = table.Column<int>(type: "integer", nullable: false),
                    PausePolicy = table.Column<int>(type: "integer", nullable: false),
                    SessionConsumptionPolicy = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TherapyPackages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TherapyPackages_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddColumn<bool>(
                name: "IsExtraSession",
                table: "Appointments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReservedAt",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SessionConsumed",
                table: "Appointments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "SessionConsumedAt",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TherapyPackageId",
                table: "Appointments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_TherapyPackageId",
                table: "Appointments",
                column: "TherapyPackageId");

            migrationBuilder.CreateIndex(
                name: "IX_Holidays_PsychologistId_Date",
                table: "Holidays",
                columns: new[] { "PsychologistId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TherapyPackages_PatientId",
                table: "TherapyPackages",
                column: "PatientId");

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_TherapyPackages_TherapyPackageId",
                table: "Appointments",
                column: "TherapyPackageId",
                principalTable: "TherapyPackages",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_TherapyPackages_TherapyPackageId",
                table: "Appointments");

            migrationBuilder.DropTable(
                name: "Holidays");

            migrationBuilder.DropTable(
                name: "TherapyPackages");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_TherapyPackageId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "IsExtraSession",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "ReservedAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "SessionConsumed",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "SessionConsumedAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "TherapyPackageId",
                table: "Appointments");
        }
    }
}
