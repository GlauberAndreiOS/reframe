using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    public partial class AddTherapistTermsAndPatientAcceptance : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TherapistTerms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TherapistId = table.Column<Guid>(type: "uuid", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    EffectiveFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TherapistTerms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TherapistTerms_Psychologists_TherapistId",
                        column: x => x.TherapistId,
                        principalTable: "Psychologists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PatientTermsAcceptances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    TherapistId = table.Column<Guid>(type: "uuid", nullable: false),
                    TermsVersion = table.Column<int>(type: "integer", nullable: false),
                    AcceptedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Ip = table.Column<string>(type: "text", nullable: true),
                    Device = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientTermsAcceptances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PatientTermsAcceptances_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientTermsAcceptances_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PatientTermsAcceptances_Psychologists_TherapistId",
                        column: x => x.TherapistId,
                        principalTable: "Psychologists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PatientTermsAcceptances_AppointmentId",
                table: "PatientTermsAcceptances",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PatientTermsAcceptances_PatientId_TherapistId_TermsVersion",
                table: "PatientTermsAcceptances",
                columns: new[] { "PatientId", "TherapistId", "TermsVersion" });

            migrationBuilder.CreateIndex(
                name: "IX_PatientTermsAcceptances_TherapistId",
                table: "PatientTermsAcceptances",
                column: "TherapistId");

            migrationBuilder.CreateIndex(
                name: "IX_TherapistTerms_TherapistId_Version",
                table: "TherapistTerms",
                columns: new[] { "TherapistId", "Version" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PatientTermsAcceptances");

            migrationBuilder.DropTable(
                name: "TherapistTerms");
        }
    }
}
