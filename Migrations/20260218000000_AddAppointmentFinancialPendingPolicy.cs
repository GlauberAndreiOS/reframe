using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentFinancialPendingPolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ChargeRetryAttemptCount",
                table: "Appointments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ChargeFailedAtUtc",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FinancialRegularizationDeadlineUtc",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastChargeFailureReason",
                table: "Appointments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextChargeRetryAtUtc",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethodLastFourDigits",
                table: "Appointments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethodReference",
                table: "Appointments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProvider",
                table: "Appointments",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChargeRetryAttemptCount",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "ChargeFailedAtUtc",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "FinancialRegularizationDeadlineUtc",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "LastChargeFailureReason",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "NextChargeRetryAtUtc",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentMethodLastFourDigits",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentMethodReference",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentProvider",
                table: "Appointments");
        }
    }
}
