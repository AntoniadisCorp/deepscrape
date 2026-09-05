param(
  [string]$BaseUrl = "https://ip.deepscrape.dev",
  [string]$UserId = "dev-user-1",
  [int]$TimeoutSeconds = 45
)

$tests = @(
  @{ Name = "Explicit IPv4"; Path = "/api/geo/lookup?ip=8.8.8.8"; Headers = @{ "x-user-id" = $UserId }; Expect = 200 },
  @{ Name = "Explicit IPv6"; Path = "/api/geo/lookup?ip=2001:4860:4860::8888"; Headers = @{ "x-user-id" = $UserId }; Expect = 200 },
  @{ Name = "Infer via cf-connecting-ip"; Path = "/api/geo/lookup"; Headers = @{ "x-user-id" = $UserId; "cf-connecting-ip" = "1.1.1.1" }; Expect = 200 },
  @{ Name = "Infer via x-forwarded-for"; Path = "/api/geo/lookup"; Headers = @{ "x-user-id" = $UserId; "x-forwarded-for" = "203.0.113.7, 10.0.0.2" }; Expect = 200 },
  @{ Name = "Infer via x-real-ip"; Path = "/api/geo/lookup"; Headers = @{ "x-user-id" = $UserId; "x-real-ip" = "9.9.9.9" }; Expect = 200 },
  @{ Name = "Invalid IP should 400"; Path = "/api/geo/lookup?ip=not-an-ip"; Headers = @{ "x-user-id" = $UserId }; Expect = 400 },
  @{ Name = "Missing auth should 401"; Path = "/api/geo/lookup?ip=8.8.8.8"; Headers = @{}; Expect = 401 }
)

$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)

$results = @()
foreach ($test in $tests) {
  $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, ($BaseUrl.TrimEnd('/') + $test.Path))

  foreach ($headerName in $test.Headers.Keys) {
    [void]$request.Headers.TryAddWithoutValidation($headerName, [string]$test.Headers[$headerName])
  }

  try {
    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    $status = [int]$response.StatusCode
    $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  } catch {
    $status = -1
    $body = $_.Exception.Message
  }

  $resolvedIp = $null
  $coverageGeo = $null
  $coverageProxy = $null
  if ($status -eq 200 -and -not [string]::IsNullOrWhiteSpace($body)) {
    try {
      $obj = $body | ConvertFrom-Json
      $resolvedIp = $obj.data.lookup.ip
      $coverageGeo = $obj.data.lookup.coverage.geo
      $coverageProxy = $obj.data.lookup.coverage.proxy
    } catch {
      # Keep raw body preview when response is not parseable JSON.
    }
  }

  $preview = if ([string]::IsNullOrWhiteSpace($body)) {
    ""
  } elseif ($body.Length -gt 180) {
    $body.Substring(0, 180) + "..."
  } else {
    $body
  }

  $results += [pscustomobject]@{
    Test = $test.Name
    Expected = $test.Expect
    Actual = $status
    Pass = ($status -eq $test.Expect)
    ResolvedIp = $resolvedIp
    CoverageGeo = $coverageGeo
    CoverageProxy = $coverageProxy
    Preview = $preview
  }
}

$client.Dispose()

$results | Format-Table -AutoSize

$passCount = ($results | Where-Object { $_.Pass }).Count
$failCount = $results.Count - $passCount
Write-Host ""
Write-Host "Summary: $passCount passed, $failCount failed"

if ($failCount -gt 0) {
  Write-Host ""
  Write-Host "Failed tests:" -ForegroundColor Yellow
  $results | Where-Object { -not $_.Pass } | Format-Table Test, Expected, Actual, Preview -AutoSize
  exit 1
}
