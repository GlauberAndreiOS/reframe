using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancialLedger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "financial_ledger",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    patient_id = table.Column<Guid>(type: "uuid", nullable: false),
                    therapist_id = table.Column<Guid>(type: "uuid", nullable: false),
                    appointment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    package_id = table.Column<Guid>(type: "uuid", nullable: true),
                    amount_cents = table.Column<long>(type: "bigint", nullable: false),
                    currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    direction = table.Column<string>(type: "text", nullable: false),
                    event_type = table.Column<string>(type: "text", nullable: false),
                    occurred_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    metadata_json = table.Column<string>(type: "jsonb", nullable: false),
                    idempotency_key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    source = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_financial_ledger", x => x.id);
                    table.ForeignKey(
                        name: "FK_financial_ledger_Appointments_appointment_id",
                        column: x => x.appointment_id,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_financial_ledger_Patients_patient_id",
                        column: x => x.patient_id,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_financial_ledger_Psychologists_therapist_id",
                        column: x => x.therapist_id,
                        principalTable: "Psychologists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_financial_ledger_appointment_id",
                table: "financial_ledger",
                column: "appointment_id");

            migrationBuilder.CreateIndex(
                name: "IX_financial_ledger_idempotency_key",
                table: "financial_ledger",
                column: "idempotency_key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_financial_ledger_patient_id_therapist_id_occurred_at",
                table: "financial_ledger",
                columns: new[] { "patient_id", "therapist_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_financial_ledger_therapist_id",
                table: "financial_ledger",
                column: "therapist_id");

            migrationBuilder.Sql(
                """
                CREATE OR REPLACE FUNCTION prevent_financial_ledger_mutation()
                RETURNS trigger AS $$
                BEGIN
                    RAISE EXCEPTION 'financial_ledger is append-only';
                END;
                $$ LANGUAGE plpgsql;
                """);

            migrationBuilder.Sql(
                """
                CREATE TRIGGER trg_financial_ledger_no_update
                BEFORE UPDATE ON financial_ledger
                FOR EACH ROW EXECUTE FUNCTION prevent_financial_ledger_mutation();
                """);

            migrationBuilder.Sql(
                """
                CREATE TRIGGER trg_financial_ledger_no_delete
                BEFORE DELETE ON financial_ledger
                FOR EACH ROW EXECUTE FUNCTION prevent_financial_ledger_mutation();
                """);

            migrationBuilder.Sql(
                """
                CREATE VIEW financial_ledger_current_balance AS
                SELECT
                    patient_id,
                    therapist_id,
                    currency,
                    SUM(
                        CASE
                            WHEN direction = 'Credit' THEN amount_cents
                            ELSE -amount_cents
                        END
                    )::bigint AS balance_cents,
                    MAX(occurred_at) AS last_occurred_at
                FROM financial_ledger
                GROUP BY patient_id, therapist_id, currency;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP VIEW IF EXISTS financial_ledger_current_balance;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_financial_ledger_no_delete ON financial_ledger;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_financial_ledger_no_update ON financial_ledger;");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS prevent_financial_ledger_mutation();");

            migrationBuilder.DropTable(
                name: "financial_ledger");
        }
    }
}
