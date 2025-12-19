#!/bin/bash
# Quick script to check available organizations

echo "=========================================="
echo "Available Organizations:"
echo "=========================================="
curl -s http://localhost:3000/api/organizations/ | python3 -m json.tool

echo ""
echo "=========================================="
echo "Instructions:"
echo "=========================================="
echo "1. Copy the 'id' number from above"
echo "2. Edit test.py and change this line:"
echo "   ORGANIZATION_ID = 1  # Change to your ID"
echo ""
echo "Example:"
echo "  If you see: {\"id\": 2, \"name\": \"Hospital A\"}"
echo "  Then use: ORGANIZATION_ID = 2"
echo "=========================================="
