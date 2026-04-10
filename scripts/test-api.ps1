# Pilates Studio API Test Script
$baseUrl = "http://localhost:3000/api"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Pilates Studio API Test Suite" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Login and get token
Write-Host "`n[1] Testing Auth - Login" -ForegroundColor Yellow
$loginBody = @{
    email = "admin@pilates.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.accessToken
    $refreshToken = $loginResponse.data.refreshToken
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  User: $($loginResponse.data.user.email)" -ForegroundColor Gray
    Write-Host "  Role: $($loginResponse.data.user.role.code)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Login failed: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Test Health Endpoints
Write-Host "`n[2] Testing Health Endpoints" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✓ Health check: $($health.data.status)" -ForegroundColor Green
    
    $dbHealth = Invoke-RestMethod -Uri "$baseUrl/health/db" -Method GET
    Write-Host "✓ Database health: $($dbHealth.data.database)" -ForegroundColor Green
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
}

# 3. Test Members
Write-Host "`n[3] Testing Members API" -ForegroundColor Yellow
try {
    $members = Invoke-RestMethod -Uri "$baseUrl/members?page=1&pageSize=5" -Method GET -Headers $headers
    Write-Host "✓ Get members: $($members.meta.total) total, $($members.data.Count) returned" -ForegroundColor Green
    
    if ($members.data.Count -gt 0) {
        $memberId = $members.data[0].id
        $member = Invoke-RestMethod -Uri "$baseUrl/members/$memberId" -Method GET -Headers $headers
        Write-Host "✓ Get member by ID: $($member.data.name)" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Members API failed: $_" -ForegroundColor Red
}

# 4. Test Coaches
Write-Host "`n[4] Testing Coaches API" -ForegroundColor Yellow
try {
    $coaches = Invoke-RestMethod -Uri "$baseUrl/coaches" -Method GET -Headers $headers
    Write-Host "✓ Get coaches: $($coaches.data.Count) coaches" -ForegroundColor Green
    
    $activeCoaches = Invoke-RestMethod -Uri "$baseUrl/coaches/active" -Method GET -Headers $headers
    Write-Host "✓ Get active coaches: $($activeCoaches.data.Count) active" -ForegroundColor Green
    
    if ($coaches.data.Count -gt 0) {
        $coachId = $coaches.data[0].id
        $coachStats = Invoke-RestMethod -Uri "$baseUrl/coaches/$coachId/stats" -Method GET -Headers $headers
        Write-Host "✓ Get coach stats: $($coachStats.data.totalCourses) courses" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Coaches API failed: $_" -ForegroundColor Red
}

# 5. Test Courses
Write-Host "`n[5] Testing Courses API" -ForegroundColor Yellow
try {
    $courses = Invoke-RestMethod -Uri "$baseUrl/courses" -Method GET -Headers $headers
    Write-Host "✓ Get courses: $($courses.data.Count) courses" -ForegroundColor Green
    
    $activeCourses = Invoke-RestMethod -Uri "$baseUrl/courses/active" -Method GET -Headers $headers
    Write-Host "✓ Get active courses: $($activeCourses.data.Count) active" -ForegroundColor Green
} catch {
    Write-Host "✗ Courses API failed: $_" -ForegroundColor Red
}

# 6. Test Course Sessions
Write-Host "`n[6] Testing Course Sessions API" -ForegroundColor Yellow
try {
    $upcomingSessions = Invoke-RestMethod -Uri "$baseUrl/course-sessions/upcoming" -Method GET -Headers $headers
    Write-Host "✓ Get upcoming sessions: $($upcomingSessions.data.Count) upcoming" -ForegroundColor Green
} catch {
    Write-Host "✗ Course Sessions API failed: $_" -ForegroundColor Red
}

# 7. Test Bookings
Write-Host "`n[7] Testing Bookings API" -ForegroundColor Yellow
try {
    $bookings = Invoke-RestMethod -Uri "$baseUrl/bookings?page=1&pageSize=5" -Method GET -Headers $headers
    Write-Host "✓ Get bookings: $($bookings.meta.total) total" -ForegroundColor Green
} catch {
    Write-Host "✗ Bookings API failed: $_" -ForegroundColor Red
}

# 8. Test Transactions
Write-Host "`n[8] Testing Transactions API" -ForegroundColor Yellow
try {
    $transactions = Invoke-RestMethod -Uri "$baseUrl/transactions?page=1&pageSize=5" -Method GET -Headers $headers
    Write-Host "✓ Get transactions: $($transactions.meta.total) total" -ForegroundColor Green
    
    $summary = Invoke-RestMethod -Uri "$baseUrl/transactions/summary" -Method GET -Headers $headers
    Write-Host "✓ Get transaction summary" -ForegroundColor Green
} catch {
    Write-Host "✗ Transactions API failed: $_" -ForegroundColor Red
}

# 9. Test Membership Plans
Write-Host "`n[9] Testing Membership Plans API" -ForegroundColor Yellow
try {
    $plans = Invoke-RestMethod -Uri "$baseUrl/membership-plans" -Method GET -Headers $headers
    Write-Host "✓ Get membership plans: $($plans.data.Count) plans" -ForegroundColor Green
    
    $activePlans = Invoke-RestMethod -Uri "$baseUrl/membership-plans/active" -Method GET -Headers $headers
    Write-Host "✓ Get active plans: $($activePlans.data.Count) active" -ForegroundColor Green
} catch {
    Write-Host "✗ Membership Plans API failed: $_" -ForegroundColor Red
}

# 10. Test Settings
Write-Host "`n[10] Testing Settings API" -ForegroundColor Yellow
try {
    $studioSettings = Invoke-RestMethod -Uri "$baseUrl/settings/studio" -Method GET -Headers $headers
    Write-Host "✓ Get studio settings: $($studioSettings.data.studioName)" -ForegroundColor Green
    
    $notifications = Invoke-RestMethod -Uri "$baseUrl/settings/notifications" -Method GET -Headers $headers
    Write-Host "✓ Get notification settings: $($notifications.data.Count) items" -ForegroundColor Green
} catch {
    Write-Host "✗ Settings API failed: $_" -ForegroundColor Red
}

# 11. Test Reports
Write-Host "`n[11] Testing Reports API" -ForegroundColor Yellow
try {
    $memberReport = Invoke-RestMethod -Uri "$baseUrl/reports/members" -Method GET -Headers $headers
    Write-Host "✓ Get member report" -ForegroundColor Green
    
    $fromDate = "2025-01-01"
    $toDate = "2025-12-31"
    
    $bookingReport = Invoke-RestMethod -Uri "$baseUrl/reports/bookings?from=$fromDate&to=$toDate" -Method GET -Headers $headers
    Write-Host "✓ Get booking report" -ForegroundColor Green
    
    $transactionReport = Invoke-RestMethod -Uri "$baseUrl/reports/transactions?from=$fromDate&to=$toDate" -Method GET -Headers $headers
    Write-Host "✓ Get transaction report" -ForegroundColor Green
} catch {
    Write-Host "✗ Reports API failed: $_" -ForegroundColor Red
}

# 12. Test Roles
Write-Host "`n[12] Testing Roles API" -ForegroundColor Yellow
try {
    $roles = Invoke-RestMethod -Uri "$baseUrl/roles" -Method GET -Headers $headers
    Write-Host "✓ Get roles: $($roles.data.Count) roles" -ForegroundColor Green
} catch {
    Write-Host "✗ Roles API failed: $_" -ForegroundColor Red
}

# 13. Test Refresh Token
Write-Host "`n[13] Testing Token Refresh" -ForegroundColor Yellow
try {
    $refreshBody = @{
        refreshToken = $refreshToken
    } | ConvertTo-Json
    
    $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/auth/refresh" -Method POST -Body $refreshBody -ContentType "application/json"
    Write-Host "✓ Token refresh successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Token refresh failed: $_" -ForegroundColor Red
}

# 14. Test Logout
Write-Host "`n[14] Testing Logout" -ForegroundColor Yellow
try {
    $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method POST -Headers $headers
    Write-Host "✓ Logout successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Logout failed: $_" -ForegroundColor Red
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Test Suite Completed" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
