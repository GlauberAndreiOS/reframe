using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    /// <inheritdoc />
    public partial class TempIdToAutomaticThoughts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop foreign keys
            migrationBuilder.DropForeignKey(name: "FK_AutomaticThoughts_Patients_PatientId", table: "AutomaticThoughts");
            migrationBuilder.DropForeignKey(name: "FK_Patients_Psychologists_PsychologistId", table: "Patients");
            migrationBuilder.DropForeignKey(name: "FK_Patients_Users_UserId", table: "Patients");
            migrationBuilder.DropForeignKey(name: "FK_Psychologists_Users_UserId", table: "Psychologists");

            // Drop primary keys
            migrationBuilder.DropPrimaryKey(name: "PK_Users", table: "Users");
            migrationBuilder.DropPrimaryKey(name: "PK_Psychologists", table: "Psychologists");
            migrationBuilder.DropPrimaryKey(name: "PK_Patients", table: "Patients");
            migrationBuilder.DropPrimaryKey(name: "PK_AutomaticThoughts", table: "AutomaticThoughts");

            // Create new Guid-based Id columns
            migrationBuilder.AddColumn<Guid>(name: "GuidId", table: "Users", type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()");
            migrationBuilder.AddColumn<Guid>(name: "GuidId", table: "Psychologists", type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()");
            migrationBuilder.AddColumn<Guid>(name: "GuidId", table: "Patients", type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()");
            migrationBuilder.AddColumn<Guid>(name: "GuidId", table: "AutomaticThoughts", type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()");

            // Create new Guid-based foreign key columns
            migrationBuilder.AddColumn<Guid>(name: "GuidUserId", table: "Psychologists", type: "uuid", nullable: false, defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
            migrationBuilder.AddColumn<Guid>(name: "GuidUserId", table: "Patients", type: "uuid", nullable: false, defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
            migrationBuilder.AddColumn<Guid>(name: "GuidPsychologistId", table: "Patients", type: "uuid", nullable: true);
            migrationBuilder.AddColumn<Guid>(name: "GuidPatientId", table: "AutomaticThoughts", type: "uuid", nullable: false, defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            // Update the new Guid-based foreign key columns
            migrationBuilder.Sql(@"
                UPDATE ""Psychologists"" p SET ""GuidUserId"" = u.""GuidId""
                FROM ""Users"" u WHERE p.""UserId"" = u.""Id"";
            ");
            migrationBuilder.Sql(@"
                UPDATE ""Patients"" p SET ""GuidUserId"" = u.""GuidId""
                FROM ""Users"" u WHERE p.""UserId"" = u.""Id"";
            ");
            migrationBuilder.Sql(@"
                UPDATE ""Patients"" p SET ""GuidPsychologistId"" = ps.""GuidId""
                FROM ""Psychologists"" ps WHERE p.""PsychologistId"" = ps.""Id"";
            ");
            migrationBuilder.Sql(@"
                UPDATE ""AutomaticThoughts"" a SET ""GuidPatientId"" = p.""GuidId""
                FROM ""Patients"" p WHERE a.""PatientId"" = p.""Id"";
            ");

            // Drop old Id columns
            migrationBuilder.DropColumn(name: "Id", table: "Users");
            migrationBuilder.DropColumn(name: "Id", table: "Psychologists");
            migrationBuilder.DropColumn(name: "Id", table: "Patients");
            migrationBuilder.DropColumn(name: "Id", table: "AutomaticThoughts");

            // Rename new Guid-based Id columns
            migrationBuilder.RenameColumn(name: "GuidId", table: "Users", newName: "Id");
            migrationBuilder.RenameColumn(name: "GuidId", table: "Psychologists", newName: "Id");
            migrationBuilder.RenameColumn(name: "GuidId", table: "Patients", newName: "Id");
            migrationBuilder.RenameColumn(name: "GuidId", table: "AutomaticThoughts", newName: "Id");

            // Drop old foreign key columns
            migrationBuilder.DropColumn(name: "UserId", table: "Psychologists");
            migrationBuilder.DropColumn(name: "UserId", table: "Patients");
            migrationBuilder.DropColumn(name: "PsychologistId", table: "Patients");
            migrationBuilder.DropColumn(name: "PatientId", table: "AutomaticThoughts");

            // Rename new Guid-based foreign key columns
            migrationBuilder.RenameColumn(name: "GuidUserId", table: "Psychologists", newName: "UserId");
            migrationBuilder.RenameColumn(name: "GuidUserId", table: "Patients", newName: "UserId");
            migrationBuilder.RenameColumn(name: "GuidPsychologistId", table: "Patients", newName: "PsychologistId");
            migrationBuilder.RenameColumn(name: "GuidPatientId", table: "AutomaticThoughts", newName: "PatientId");

            // Add primary keys
            migrationBuilder.AddPrimaryKey(name: "PK_Users", table: "Users", column: "Id");
            migrationBuilder.AddPrimaryKey(name: "PK_Psychologists", table: "Psychologists", column: "Id");
            migrationBuilder.AddPrimaryKey(name: "PK_Patients", table: "Patients", column: "Id");
            migrationBuilder.AddPrimaryKey(name: "PK_AutomaticThoughts", table: "AutomaticThoughts", column: "Id");

            // Add foreign keys
            migrationBuilder.AddForeignKey(
                name: "FK_AutomaticThoughts_Patients_PatientId",
                table: "AutomaticThoughts",
                column: "PatientId",
                principalTable: "Patients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_Psychologists_PsychologistId",
                table: "Patients",
                column: "PsychologistId",
                principalTable: "Psychologists",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_Users_UserId",
                table: "Patients",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Psychologists_Users_UserId",
                table: "Psychologists",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This is a destructive migration, so the Down method is not fully supported.
            // You would need to reverse the steps in the Up method to go back to the previous state.
            throw new NotSupportedException("This migration cannot be reverted.");
        }
    }
}
