using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingPsychologistLinkRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PendingPsychologistId",
                table: "Patients",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_PendingPsychologistId",
                table: "Patients",
                column: "PendingPsychologistId");

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_Psychologists_PendingPsychologistId",
                table: "Patients",
                column: "PendingPsychologistId",
                principalTable: "Psychologists",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Patients_Psychologists_PendingPsychologistId",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_PendingPsychologistId",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "PendingPsychologistId",
                table: "Patients");
        }
    }
}
