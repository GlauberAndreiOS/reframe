using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    public partial class AddTherapistPayoutAndLedger : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TherapistLedgerTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PsychologistId = table.Column<Guid>(type: "uuid", nullable: false),
                    MercadoPagoTransactionId = table.Column<string>(type: "text", nullable: false),
                    MercadoPagoStatus = table.Column<string>(type: "text", nullable: true),
                    GrossAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PlatformFeeAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    NetAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    ReleaseStatus = table.Column<int>(type: "integer", nullable: false),
                    PaymentConfirmedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpectedReleaseAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReleasedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReversedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    BlockedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastReconciledAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReconciliationNotes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TherapistLedgerTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TherapistLedgerTransactions_Psychologists_PsychologistId",
                        column: x => x.PsychologistId,
                        principalTable: "Psychologists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TherapistPayoutAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PsychologistId = table.Column<Guid>(type: "uuid", nullable: false),
                    Method = table.Column<int>(type: "integer", nullable: false),
                    PixKeyType = table.Column<string>(type: "text", nullable: true),
                    PixKey = table.Column<string>(type: "text", nullable: true),
                    BankCode = table.Column<string>(type: "text", nullable: true),
                    BankBranch = table.Column<string>(type: "text", nullable: true),
                    BankAccountNumber = table.Column<string>(type: "text", nullable: true),
                    BankAccountDigit = table.Column<string>(type: "text", nullable: true),
                    HolderName = table.Column<string>(type: "text", nullable: false),
                    HolderDocument = table.Column<string>(type: "text", nullable: false),
                    IsHolderValidated = table.Column<bool>(type: "boolean", nullable: false),
                    HolderValidationMessage = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TherapistPayoutAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TherapistPayoutAccounts_Psychologists_PsychologistId",
                        column: x => x.PsychologistId,
                        principalTable: "Psychologists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TherapistPayoutPolicies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PsychologistId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReleasePolicy = table.Column<int>(type: "integer", nullable: false),
                    ReleaseDelayDays = table.Column<int>(type: "integer", nullable: false),
                    PlatformFeeFixed = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    PlatformFeePercent = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    FutureChargebackReservePercent = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TherapistPayoutPolicies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TherapistPayoutPolicies_Psychologists_PsychologistId",
                        column: x => x.PsychologistId,
                        principalTable: "Psychologists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TherapistLedgerTransactions_MercadoPagoTransactionId",
                table: "TherapistLedgerTransactions",
                column: "MercadoPagoTransactionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TherapistLedgerTransactions_PsychologistId",
                table: "TherapistLedgerTransactions",
                column: "PsychologistId");

            migrationBuilder.CreateIndex(
                name: "IX_TherapistPayoutAccounts_PsychologistId",
                table: "TherapistPayoutAccounts",
                column: "PsychologistId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TherapistPayoutPolicies_PsychologistId",
                table: "TherapistPayoutPolicies",
                column: "PsychologistId",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "TherapistLedgerTransactions");
            migrationBuilder.DropTable(name: "TherapistPayoutAccounts");
            migrationBuilder.DropTable(name: "TherapistPayoutPolicies");
        }
    }
}
