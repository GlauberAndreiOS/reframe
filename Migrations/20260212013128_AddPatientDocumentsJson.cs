using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using reframe.Models;

#nullable disable

namespace reframe.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientDocumentsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<PatientDocument>>(
                name: "Documents",
                table: "Patients",
                type: "jsonb",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "Patients"
                SET "Documents" = (
                    COALESCE("Documents", '[]'::jsonb)
                    ||
                    CASE
                        WHEN "ExternalRecordPdfUrl" IS NOT NULL
                             AND "ExternalRecordPdfUrl" <> ''
                             AND NOT EXISTS (
                                 SELECT 1
                                 FROM jsonb_array_elements(COALESCE("Documents", '[]'::jsonb)) AS elem
                                 WHERE elem->>'relativePath' = "ExternalRecordPdfUrl"
                             ) THEN
                            jsonb_build_array(
                                jsonb_build_object(
                                    'id', (md5(random()::text || clock_timestamp()::text)::uuid)::text,
                                    'kind', 'external_record',
                                    'displayName', 'Prontuario externo',
                                    'originalFileName', regexp_replace("ExternalRecordPdfUrl", '^.*/', ''),
                                    'mimeType', 'application/pdf',
                                    'extension', '.pdf',
                                    'relativePath', "ExternalRecordPdfUrl",
                                    'sizeBytes', 0,
                                    'uploadedAtUtc', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
                                    'uploadedByUserId', NULL,
                                    'csvSummary', NULL
                                )
                            )
                        ELSE '[]'::jsonb
                    END
                    ||
                    CASE
                        WHEN "ObstetricDataFileUrl" IS NOT NULL
                             AND "ObstetricDataFileUrl" <> ''
                             AND NOT EXISTS (
                                 SELECT 1
                                 FROM jsonb_array_elements(COALESCE("Documents", '[]'::jsonb)) AS elem
                                 WHERE elem->>'relativePath' = "ObstetricDataFileUrl"
                             ) THEN
                            jsonb_build_array(
                                jsonb_build_object(
                                    'id', (md5(random()::text || clock_timestamp()::text)::uuid)::text,
                                    'kind', 'obstetric_data',
                                    'displayName', 'Dados obstetricos',
                                    'originalFileName', regexp_replace("ObstetricDataFileUrl", '^.*/', ''),
                                    'mimeType', 'application/octet-stream',
                                    'extension', regexp_replace("ObstetricDataFileUrl", '^.*(\.[^.]+)$', '\1'),
                                    'relativePath', "ObstetricDataFileUrl",
                                    'sizeBytes', 0,
                                    'uploadedAtUtc', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
                                    'uploadedByUserId', NULL,
                                    'csvSummary', NULL
                                )
                            )
                        ELSE '[]'::jsonb
                    END
                )
                WHERE ("ExternalRecordPdfUrl" IS NOT NULL AND "ExternalRecordPdfUrl" <> '')
                   OR ("ObstetricDataFileUrl" IS NOT NULL AND "ObstetricDataFileUrl" <> '');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Documents",
                table: "Patients");
        }
    }
}
