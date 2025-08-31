const { chromium } = require('playwright');

async function testCustomerPage() {
  console.log('🚀 Starting customer detail page test...');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down actions for better visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Collect console messages and errors
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
    console.log(`📊 Console ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log(`❌ Page Error: ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    console.log(`🚫 Failed Request: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    console.log('📍 Navigating to customer detail page...');
    
    // Navigate to the customer detail page
    const customerUrl = 'http://127.0.0.1:3000/customers/2fc93ebd-fe0e-4139-9a81-6b34f77a985c';
    await page.goto(customerUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Wait for page to be fully loaded
    await page.waitForTimeout(3000);
    
    // Check if we're on a login page (redirect due to authentication)
    const currentUrl = page.url();
    console.log(`🌐 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
      console.log('🔐 Redirected to login page - authentication required');
      
      // Try to find login elements
      const loginForm = await page.$('form');
      if (loginForm) {
        console.log('📝 Login form found on page');
      }
      
      // Take screenshot of login page
      await page.screenshot({ 
        path: '/Users/mikhailfedosov/Documents/1769/flash1769/login-redirect-screenshot.png',
        fullPage: true 
      });
      console.log('📸 Screenshot saved: login-redirect-screenshot.png');
      
    } else {
      console.log('🎯 Successfully reached customer detail page');
      
      // Check for customer profile information
      console.log('🔍 Checking for customer profile elements...');
      
      // Look for common customer profile elements
      const profileElements = await page.evaluate(() => {
        const elements = {};
        
        // Check for headings that might contain customer info
        elements.headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
          tag: h.tagName,
          text: h.textContent?.trim(),
          visible: h.offsetParent !== null
        }));
        
        // Check for customer-related text
        elements.customerText = document.body.textContent?.includes('customer') || 
                               document.body.textContent?.includes('Customer');
        
        // Check for tables (projects and vehicles)
        elements.tables = Array.from(document.querySelectorAll('table')).map(table => ({
          rows: table.rows.length,
          headers: Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim()),
          visible: table.offsetParent !== null
        }));
        
        // Check for loading states
        elements.loadingIndicators = Array.from(document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="skeleton"]')).length;
        
        // Check for error messages
        elements.errorMessages = Array.from(document.querySelectorAll('[class*="error"], [role="alert"]')).map(el => ({
          text: el.textContent?.trim(),
          visible: el.offsetParent !== null
        }));
        
        // Check for empty state messages
        elements.emptyStates = Array.from(document.querySelectorAll('[class*="empty"], [class*="no-data"]')).map(el => ({
          text: el.textContent?.trim(),
          visible: el.offsetParent !== null
        }));
        
        return elements;
      });
      
      console.log('📊 Profile Elements Analysis:');
      console.log('- Headings found:', profileElements.headings.length);
      console.log('- Customer text present:', profileElements.customerText);
      console.log('- Tables found:', profileElements.tables.length);
      console.log('- Loading indicators:', profileElements.loadingIndicators);
      console.log('- Error messages:', profileElements.errorMessages.length);
      console.log('- Empty states:', profileElements.emptyStates.length);
      
      // Log specific findings
      if (profileElements.headings.length > 0) {
        console.log('📝 Headings content:');
        profileElements.headings.forEach((h, i) => {
          console.log(`  ${i + 1}. ${h.tag}: "${h.text}" (visible: ${h.visible})`);
        });
      }
      
      if (profileElements.tables.length > 0) {
        console.log('📊 Tables found:');
        profileElements.tables.forEach((table, i) => {
          console.log(`  Table ${i + 1}: ${table.rows} rows, headers: [${table.headers.join(', ')}] (visible: ${table.visible})`);
        });
      }
      
      if (profileElements.errorMessages.length > 0) {
        console.log('⚠️  Error messages found:');
        profileElements.errorMessages.forEach((error, i) => {
          console.log(`  ${i + 1}. "${error.text}" (visible: ${error.visible})`);
        });
      }
      
      if (profileElements.emptyStates.length > 0) {
        console.log('📭 Empty states found:');
        profileElements.emptyStates.forEach((state, i) => {
          console.log(`  ${i + 1}. "${state.text}" (visible: ${state.visible})`);
        });
      }
      
      // Take full page screenshot
      await page.screenshot({ 
        path: '/Users/mikhailfedosov/Documents/1769/flash1769/customer-page-screenshot.png',
        fullPage: true 
      });
      console.log('📸 Full page screenshot saved: customer-page-screenshot.png');
    }
    
    // Analyze console messages
    console.log('\n📋 Console Messages Summary:');
    const errorLogs = consoleMessages.filter(msg => msg.type === 'error');
    const warningLogs = consoleMessages.filter(msg => msg.type === 'warning');
    const infoLogs = consoleMessages.filter(msg => msg.type === 'log' || msg.type === 'info');
    
    console.log(`- Errors: ${errorLogs.length}`);
    console.log(`- Warnings: ${warningLogs.length}`);
    console.log(`- Info/Log: ${infoLogs.length}`);
    
    if (errorLogs.length > 0) {
      console.log('\n❌ JavaScript Errors:');
      errorLogs.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.text}`);
        if (error.location) {
          console.log(`     Location: ${error.location.url}:${error.location.lineNumber}`);
        }
      });
    }
    
    if (warningLogs.length > 0) {
      console.log('\n⚠️  JavaScript Warnings:');
      warningLogs.slice(0, 5).forEach((warning, i) => { // Limit to first 5 warnings
        console.log(`  ${i + 1}. ${warning.text}`);
      });
      if (warningLogs.length > 5) {
        console.log(`  ... and ${warningLogs.length - 5} more warnings`);
      }
    }
    
    // Page errors summary
    if (errors.length > 0) {
      console.log('\n💥 Page Errors:');
      errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take screenshot on error
    try {
      await page.screenshot({ 
        path: '/Users/mikhailfedosov/Documents/1769/flash1769/error-screenshot.png',
        fullPage: true 
      });
      console.log('📸 Error screenshot saved: error-screenshot.png');
    } catch (screenshotError) {
      console.log('Failed to take error screenshot:', screenshotError.message);
    }
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

// Run the test
testCustomerPage().catch(console.error);