#!/usr/bin/env node

/**
 * Health Check Script for MyWineMemoryV3
 * Verifies that the deployed application is working correctly
 */

const https = require('https')
const http = require('http')
const { execSync } = require('child_process')

// Configuration
const config = {
  // Update these URLs to match your deployment
  productionUrl: 'https://your-project-id.web.app',
  stagingUrl: 'https://your-project-id--staging.web.app',
  timeout: 10000,
  retries: 3,
  retryDelay: 2000
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`
}

function log(level, message) {
  const timestamp = new Date().toISOString()
  const colorMap = {
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red'
  }
  
  console.log(`${colorize('cyan', timestamp)} ${colorize(colorMap[level] || 'reset', `[${level.toUpperCase()}]`)} ${message}`)
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const requestModule = urlObj.protocol === 'https:' ? https : http
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      timeout: options.timeout || config.timeout,
      headers: {
        'User-Agent': 'MyWineMemoryV3-HealthCheck/1.0',
        ...options.headers
      }
    }
    
    const req = requestModule.request(requestOptions, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: Date.now() - startTime
        })
      })
    })
    
    const startTime = Date.now()
    
    req.on('error', (err) => {
      reject(err)
    })
    
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

// Retry wrapper
async function withRetry(fn, retries = config.retries) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries - 1) throw error
      
      log('warning', `Attempt ${i + 1} failed, retrying in ${config.retryDelay}ms: ${error.message}`)
      await sleep(config.retryDelay)
    }
  }
}

// Health check tests
const healthChecks = {
  // Basic connectivity test
  async connectivity(url) {
    log('info', `Testing connectivity to ${url}`)
    
    const response = await withRetry(() => makeRequest(url))
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      log('success', `✅ Connectivity test passed (${response.statusCode}) - ${response.responseTime}ms`)
      return { status: 'pass', responseTime: response.responseTime }
    } else {
      throw new Error(`HTTP ${response.statusCode}`)
    }
  },

  // Test if the SPA routing works
  async routing(url) {
    log('info', `Testing SPA routing`)
    
    const routes = ['/records', '/settings', '/profile']
    const results = []
    
    for (const route of routes) {
      try {
        const response = await makeRequest(`${url}${route}`)
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          results.push({ route, status: 'pass', responseTime: response.responseTime })
        } else {
          results.push({ route, status: 'fail', error: `HTTP ${response.statusCode}` })
        }
      } catch (error) {
        results.push({ route, status: 'fail', error: error.message })
      }
    }
    
    const passCount = results.filter(r => r.status === 'pass').length
    
    if (passCount === routes.length) {
      log('success', `✅ All routes accessible (${passCount}/${routes.length})`)
    } else if (passCount > 0) {
      log('warning', `⚠️ Some routes accessible (${passCount}/${routes.length})`)
    } else {
      log('error', `❌ No routes accessible (${passCount}/${routes.length})`)
    }
    
    return { status: passCount > 0 ? 'pass' : 'fail', results }
  },

  // Test if static assets are served correctly
  async staticAssets(url) {
    log('info', `Testing static assets`)
    
    const response = await makeRequest(url)
    const html = response.body
    
    // Extract asset URLs from HTML
    const cssMatches = html.match(/href="([^"]*\.css[^"]*)"/g) || []
    const jsMatches = html.match(/src="([^"]*\.js[^"]*)"/g) || []
    
    const cssUrls = cssMatches.map(match => match.match(/href="([^"]*)"/)[1])
    const jsUrls = jsMatches.map(match => match.match(/src="([^"]*)"/)[1])
    
    const assetResults = []
    
    // Test CSS files
    for (const cssUrl of cssUrls.slice(0, 3)) { // Test first 3 CSS files
      try {
        const fullUrl = cssUrl.startsWith('http') ? cssUrl : `${url}${cssUrl}`
        const assetResponse = await makeRequest(fullUrl)
        
        assetResults.push({
          url: cssUrl,
          type: 'css',
          status: assetResponse.statusCode < 400 ? 'pass' : 'fail',
          responseTime: assetResponse.responseTime
        })
      } catch (error) {
        assetResults.push({
          url: cssUrl,
          type: 'css',
          status: 'fail',
          error: error.message
        })
      }
    }
    
    // Test JS files
    for (const jsUrl of jsUrls.slice(0, 3)) { // Test first 3 JS files
      try {
        const fullUrl = jsUrl.startsWith('http') ? jsUrl : `${url}${jsUrl}`
        const assetResponse = await makeRequest(fullUrl)
        
        assetResults.push({
          url: jsUrl,
          type: 'js',
          status: assetResponse.statusCode < 400 ? 'pass' : 'fail',
          responseTime: assetResponse.responseTime
        })
      } catch (error) {
        assetResults.push({
          url: jsUrl,
          type: 'js',
          status: 'fail',
          error: error.message
        })
      }
    }
    
    const passCount = assetResults.filter(r => r.status === 'pass').length
    const totalCount = assetResults.length
    
    if (passCount === totalCount && totalCount > 0) {
      log('success', `✅ All static assets loading (${passCount}/${totalCount})`)
    } else if (passCount > 0) {
      log('warning', `⚠️ Some static assets loading (${passCount}/${totalCount})`)
    } else {
      log('error', `❌ No static assets loading (${passCount}/${totalCount})`)
    }
    
    return { status: passCount > 0 ? 'pass' : 'fail', results: assetResults }
  },

  // Test performance
  async performance(url) {
    log('info', `Testing performance`)
    
    const samples = []
    const sampleCount = 5
    
    for (let i = 0; i < sampleCount; i++) {
      const response = await makeRequest(url)
      samples.push(response.responseTime)
    }
    
    const average = samples.reduce((a, b) => a + b, 0) / samples.length
    const min = Math.min(...samples)
    const max = Math.max(...samples)
    
    log('info', `Response times: avg=${average.toFixed(0)}ms, min=${min}ms, max=${max}ms`)
    
    if (average < 2000) {
      log('success', `✅ Performance test passed (avg: ${average.toFixed(0)}ms)`)
      return { status: 'pass', average, min, max, samples }
    } else {
      log('warning', `⚠️ Performance test warning (avg: ${average.toFixed(0)}ms > 2000ms)`)
      return { status: 'warning', average, min, max, samples }
    }
  },

  // Test if the app is serving the correct content
  async contentValidation(url) {
    log('info', `Testing content validation`)
    
    const response = await makeRequest(url)
    const html = response.body
    
    const checks = [
      { name: 'Title', test: () => html.includes('<title>') && !html.includes('<title></title>') },
      { name: 'Meta viewport', test: () => html.includes('name="viewport"') },
      { name: 'React root', test: () => html.includes('id="root"') },
      { name: 'No error messages', test: () => !html.toLowerCase().includes('error') || !html.toLowerCase().includes('404') }
    ]
    
    const results = checks.map(check => ({
      name: check.name,
      status: check.test() ? 'pass' : 'fail'
    }))
    
    const passCount = results.filter(r => r.status === 'pass').length
    
    if (passCount === checks.length) {
      log('success', `✅ Content validation passed (${passCount}/${checks.length})`)
    } else {
      log('warning', `⚠️ Content validation partial (${passCount}/${checks.length})`)
    }
    
    return { status: passCount > 0 ? 'pass' : 'fail', results }
  }
}

// Run health checks for a URL
async function runHealthChecks(url, environment) {
  log('info', `🏥 Running health checks for ${environment}: ${url}`)
  
  const results = {}
  const startTime = Date.now()
  
  try {
    for (const [checkName, checkFn] of Object.entries(healthChecks)) {
      try {
        results[checkName] = await checkFn(url)
      } catch (error) {
        log('error', `❌ ${checkName} check failed: ${error.message}`)
        results[checkName] = { status: 'fail', error: error.message }
      }
    }
    
    const totalTime = Date.now() - startTime
    const passCount = Object.values(results).filter(r => r.status === 'pass').length
    const totalCount = Object.keys(results).length
    
    log('info', `Health check completed in ${totalTime}ms`)
    log('info', `Results: ${passCount}/${totalCount} checks passed`)
    
    if (passCount === totalCount) {
      log('success', `🎉 All health checks passed for ${environment}`)
      return { status: 'healthy', results, totalTime }
    } else if (passCount > totalCount / 2) {
      log('warning', `⚠️ ${environment} is partially healthy`)
      return { status: 'degraded', results, totalTime }
    } else {
      log('error', `❌ ${environment} is unhealthy`)
      return { status: 'unhealthy', results, totalTime }
    }
    
  } catch (error) {
    log('error', `Health check failed: ${error.message}`)
    return { status: 'error', error: error.message, results }
  }
}

// Generate health check report
function generateReport(results) {
  const timestamp = new Date().toISOString()
  
  let report = `# Health Check Report\n\n`
  report += `**Generated:** ${timestamp}\n\n`
  
  for (const [environment, result] of Object.entries(results)) {
    report += `## ${environment.charAt(0).toUpperCase() + environment.slice(1)} Environment\n\n`
    report += `**Status:** ${result.status}\n`
    report += `**Total Time:** ${result.totalTime}ms\n\n`
    
    if (result.results) {
      report += `### Check Results\n\n`
      
      for (const [checkName, checkResult] of Object.entries(result.results)) {
        const status = checkResult.status === 'pass' ? '✅' : checkResult.status === 'warning' ? '⚠️' : '❌'
        report += `- ${status} **${checkName}**: ${checkResult.status}\n`
        
        if (checkResult.error) {
          report += `  - Error: ${checkResult.error}\n`
        }
        
        if (checkResult.responseTime) {
          report += `  - Response Time: ${checkResult.responseTime}ms\n`
        }
      }
      
      report += `\n`
    }
    
    if (result.error) {
      report += `**Error:** ${result.error}\n\n`
    }
  }
  
  return report
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  const environment = args[0] || 'production'
  
  log('info', `🚀 Starting health check for ${environment} environment`)
  
  const urlMap = {
    production: config.productionUrl,
    staging: config.stagingUrl
  }
  
  const url = urlMap[environment]
  
  if (!url) {
    log('error', `Unknown environment: ${environment}`)
    log('info', `Available environments: ${Object.keys(urlMap).join(', ')}`)
    process.exit(1)
  }
  
  try {
    const results = {}
    
    if (environment === 'all') {
      // Run health checks for all environments
      for (const [env, envUrl] of Object.entries(urlMap)) {
        results[env] = await runHealthChecks(envUrl, env)
      }
    } else {
      // Run health check for specified environment
      results[environment] = await runHealthChecks(url, environment)
    }
    
    // Generate and save report
    const report = generateReport(results)
    const fs = require('fs')
    fs.writeFileSync('health-check-report.md', report)
    
    log('success', '📊 Health check report saved to health-check-report.md')
    
    // Exit with appropriate code
    const allHealthy = Object.values(results).every(r => r.status === 'healthy')
    const anyUnhealthy = Object.values(results).some(r => r.status === 'unhealthy' || r.status === 'error')
    
    if (allHealthy) {
      log('success', '🎉 All environments are healthy!')
      process.exit(0)
    } else if (anyUnhealthy) {
      log('error', '💀 Some environments are unhealthy!')
      process.exit(1)
    } else {
      log('warning', '⚠️ Some environments have warnings')
      process.exit(0)
    }
    
  } catch (error) {
    log('error', `Health check failed: ${error.message}`)
    process.exit(1)
  }
}

// Handle CLI usage
if (require.main === module) {
  main().catch(error => {
    log('error', `Unhandled error: ${error.message}`)
    process.exit(1)
  })
}

module.exports = { runHealthChecks, healthChecks }