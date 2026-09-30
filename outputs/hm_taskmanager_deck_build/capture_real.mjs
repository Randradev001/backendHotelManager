import { chromium } from 'file:///C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const out='C:/Proyectos2025/HotelManager/backendAperpBodega/outputs/real-ui-captures';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const page=await context.newPage();
await page.goto('http://127.0.0.1:5173/free/login',{waitUntil:'networkidle'});
await page.getByLabel(/email/i).fill('andres.andrade@hotelmanager.test');
await page.getByRole('textbox',{name:'Password'}).fill('HmTest26!');
const hotel=page.getByLabel(/hotel/i); if(await hotel.count()) await hotel.first().click();
await page.getByRole('button',{name:/sign in|login/i}).click();
await page.waitForTimeout(1500);
const routes=[['dashboard','/free/hotel-manager/dashboard'],['work-orders','/free/hotel-manager/work-orders'],['work-board','/free/hotel-manager/work-board'],['locations','/free/hotel-manager/locations'],['maintenance-categories','/free/hotel-manager/categories'],['assets','/free/hotel-manager/assets']];
for(const [name,url] of routes){await page.goto('http://127.0.0.1:5173'+url,{waitUntil:'networkidle'}); await page.waitForTimeout(700); await page.screenshot({path:`${out}/${name}.png`,fullPage:true});}
await page.goto('http://127.0.0.1:5173/free/login',{waitUntil:'networkidle'}); await page.screenshot({path:`${out}/login.png`,fullPage:true});
await browser.close();
