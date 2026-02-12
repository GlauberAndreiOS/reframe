using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    /// <inheritdoc />
    public partial class AddUserProfileAndRoleSpecificFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Users",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BiologicalSex",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "BirthDate",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cpf",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BusinessPhone",
                table: "Psychologists",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PresentationText",
                table: "Psychologists",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SessionDurationMinutes",
                table: "Psychologists",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Specialty",
                table: "Psychologists",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalRecord",
                table: "Patients",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ObstetricData",
                table: "Patients",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BiologicalSex",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BirthDate",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Cpf",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BusinessPhone",
                table: "Psychologists");

            migrationBuilder.DropColumn(
                name: "PresentationText",
                table: "Psychologists");

            migrationBuilder.DropColumn(
                name: "SessionDurationMinutes",
                table: "Psychologists");

            migrationBuilder.DropColumn(
                name: "Specialty",
                table: "Psychologists");

            migrationBuilder.DropColumn(
                name: "ExternalRecord",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "ObstetricData",
                table: "Patients");
        }
    }
}
