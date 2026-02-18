using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace reframe.Migrations
{
    public partial class AddBillingAndSessionStateToAppointments : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "BillingDecisionAt",
                table: "Appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ChargeDecision",
                table: "Appointments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DecisionReason",
                table: "Appointments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentStatus",
                table: "Appointments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SessionStatus",
                table: "Appointments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BillingChargeTiming",
                table: "Psychologists",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "FreeCancellationWindowHours",
                table: "Psychologists",
                type: "integer",
                nullable: false,
                defaultValue: 24);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "BillingDecisionAt", table: "Appointments");
            migrationBuilder.DropColumn(name: "ChargeDecision", table: "Appointments");
            migrationBuilder.DropColumn(name: "DecisionReason", table: "Appointments");
            migrationBuilder.DropColumn(name: "PaymentStatus", table: "Appointments");
            migrationBuilder.DropColumn(name: "SessionStatus", table: "Appointments");
            migrationBuilder.DropColumn(name: "BillingChargeTiming", table: "Psychologists");
            migrationBuilder.DropColumn(name: "FreeCancellationWindowHours", table: "Psychologists");
        }
    }
}
