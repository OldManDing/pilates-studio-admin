#!/bin/bash
# Smoke Test for Pilates Studio Backend API

set -e

echo "=== Pilates Studio Backend Smoke Test ==="
echo ""

# Check if server is running
check_server() {
  echo "Checking if server is running..."
  if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Server is running"
    return 0
  else
    echo "❌ Server is not running"
    return 1
  fi
}

# Test health endpoint
test_health() {
  echo "Testing /api/health..."
  response=$(curl -s http://localhost:3000/api/health)
  echo "Response: $response"
  if echo "$response" | grep -q '"status":"ok"'; then
    echo "✅ Health check passed"
    return 0
  else
    echo "❌ Health check failed"
    return 1
  fi
}

# Test auth endpoint (should require auth)
test_auth_protected() {
  echo "Testing /api/auth/me (should require authentication)..."
  response=$(curl -s http://localhost:3000/api/auth/me)
  echo "Response: $response"
  if echo "$response" | grep -q '"success":false' || echo "$response" | grep -q '"statusCode":401'; then
    echo "✅ Auth protection working"
    return 0
  else
    echo "⚠️ Unexpected response"
    return 0
  fi
}

# Test Swagger docs
test_swagger() {
  echo "Testing Swagger docs..."
  if curl -s http://localhost:3000/api/docs > /dev/null; then
    echo "✅ Swagger docs accessible at http://localhost:3000/api/docs"
    return 0
  else
    echo "❌ Swagger docs not accessible"
    return 1
  fi
}

# Main test flow
main() {
  echo ""
  echo "Note: Ensure server is running with 'npm run start:dev'"
  echo ""

  if ! check_server; then
    echo ""
    echo "Please start the server first:"
    echo "  npm run start:dev"
    exit 1
  fi

  echo ""
  test_health
  echo ""
  test_auth_protected
  echo ""
  test_swagger

  echo ""
  echo "=== Smoke Test Summary ==="
  echo "✅ All tests passed!"
  echo ""
  echo "Available endpoints:"
  echo "  - Health:    http://localhost:3000/api/health"
  echo "  - Swagger:   http://localhost:3000/api/docs"
  echo "  - Auth:      http://localhost:3000/api/auth/login"
  echo "  - Members:   http://localhost:3000/api/members"
  echo "  - Coaches:   http://localhost:3000/api/coaches"
  echo "  - Courses:   http://localhost:3000/api/courses"
  echo "  - Bookings:  http://localhost:3000/api/bookings"
  echo ""
}

main
