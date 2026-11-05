#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Hospital CRM - Clean Production Reset"
echo "  Target: Clear all data, keep only Managing Director"
echo "=========================================================="

echo "==> Step 1: Clearing all operational data & test records from database..."
docker compose -f docker-compose.prod.yml exec -T mysql mysql -u root -p"5@mads3LewenT%%" hospital_crm << 'EOF'
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM audit_logs;
DELETE FROM notifications;
DELETE FROM outbox_events;
DELETE FROM exports;
DELETE FROM imports;
DELETE FROM lead_testimonial_send_items;
DELETE FROM lead_testimonial_sends;
DELETE FROM testimonials;
DELETE FROM treatment_checkins;
DELETE FROM scheduled_visits;
DELETE FROM schedule_extension_requests;
DELETE FROM visit_schedules;
DELETE FROM case_handovers;
DELETE FROM escalations;
DELETE FROM appointments;
DELETE FROM tasks;
DELETE FROM interactions;
DELETE FROM cases;
DELETE FROM lead_product_interests;
DELETE FROM product_waitlist;
DELETE FROM leads;
DELETE FROM patients;
DELETE FROM campaign_products;
DELETE FROM product_campaigns;
DELETE FROM product_relations;
DELETE FROM product_price_history;
DELETE FROM product_stock_history;
DELETE FROM products;
DELETE FROM product_categories;
SET FOREIGN_KEY_CHECKS = 1;
EOF

echo "==> Step 2: Updating and rebuilding API container..."
docker compose -f docker-compose.prod.yml up -d --build api

echo "==> Step 3: Setting up Managing Director account (md@samadelements.com)..."
docker compose -f docker-compose.prod.yml exec -T api npx tsx src/database/reset-production.ts

echo "==> Step 4: Restarting API and Nginx..."
docker compose -f docker-compose.prod.yml restart api nginx

echo ""
echo "=========================================================="
echo "  ✓ Clean Production Reset Complete!"
echo "  ✓ Single Account: md@samadelements.com"
echo "  ✓ Password:       HospitalCRM@2026"
echo "=========================================================="


