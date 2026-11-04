#!/usr/bin/env python3
"""
Daily Multi-Property Matomo Analytics Email Report
Dispatches an executive intelligence summary of all web properties tracked in Matomo:
- 24-Hour, 7-Day, and 30-Day metrics per property (Visits, Uniques, Actions, Time, Bounce)
- Network-wide rollups and baseline comparisons
- Top visited pages per property
- Acquisition channels, external referrers, and search terms
- Visitor geography and device breakdown

Delivery:
- Primary: Authenticated TLS SMTP (587) from assistant@wallyatkins.com
- Fallback: Local sendmail binary (/usr/sbin/sendmail)
- Targets: wallyatkins@gmail.com, wally@wallyatkins.com, accounts@wallyatkins.com
"""

import sys
import os
import argparse
import subprocess
import datetime
import smtplib
import ssl
import re
import email.utils
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Configuration
FROM_NAME = "Wally Assistant"
FROM_EMAIL = "assistant@wallyatkins.com"
DEFAULT_RECIPIENTS = [
    "wallyatkins@gmail.com",
    "wally@wallyatkins.com",
    "accounts@wallyatkins.com"
]

SMTP_HOST = "wallyatkins.com"
SMTP_PORT = 587
SMTP_USER = "stories@wallyatkins.com"
SMTP_PASS = "1Like2tell3stories@wheniamprompted4times!"

DB_USER = "multili2_matomo"
DB_PASS = "N^&Mn67mN^&Mn67m,"
DB_NAME = "multili2_matomo"
MYSQL_BIN = "/usr/bin/mysql"
MATOMO_BASE_URL = "https://analytics.wallyatkins.com"


def run_query(sql):
    """Executes a SQL query against Matomo MySQL and returns a list of dictionaries."""
    cmd = [
        MYSQL_BIN,
        '-u', DB_USER,
        f'-p{DB_PASS}',
        DB_NAME,
        '--batch',
        '--raw',
        '-e', sql
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"[{datetime.datetime.now()}] MySQL query error: {res.stderr.strip()}", file=sys.stderr)
        return []
    lines = res.stdout.strip().split('\n')
    if not lines or not lines[0]:
        return []
    headers = lines[0].split('\t')
    rows = []
    for line in lines[1:]:
        if not line:
            continue
        parts = line.split('\t')
        if len(parts) == len(headers):
            rows.append(dict(zip(headers, parts)))
    return rows


def format_duration(seconds):
    """Formats seconds into human-readable minutes and seconds."""
    try:
        sec = int(float(seconds or 0))
    except (ValueError, TypeError):
        return "0s"
    if sec <= 0:
        return "0s"
    if sec < 60:
        return f"{sec}s"
    m = sec // 60
    s = sec % 60
    if m < 60:
        return f"{m}m {s}s" if s > 0 else f"{m}m"
    h = m // 60
    m = m % 60
    return f"{h}h {m}m"


def generate_analytics_data():
    """Queries all analytics dimensions across properties."""
    # 1. Multi-property statistics (24h, 7d, 30d)
    properties_sql = """
    SELECT 
        s.idsite, 
        s.name, 
        s.main_url,
        COUNT(CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as v_24h,
        COUNT(DISTINCT CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN v.idvisitor END) as u_24h,
        IFNULL(SUM(CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN v.visit_total_actions END), 0) as a_24h,
        ROUND(IFNULL(AVG(CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN v.visit_total_time END), 0), 0) as avg_time_24h,
        ROUND(IFNULL(SUM(CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND v.visit_total_actions = 1 THEN 1 ELSE 0 END) / 
              NULLIF(COUNT(CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END), 0) * 100, 0), 0) as bounce_24h,
        COUNT(CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as v_7d,
        COUNT(DISTINCT CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN v.idvisitor END) as u_7d,
        COUNT(CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as v_30d,
        COUNT(DISTINCT CASE WHEN v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN v.idvisitor END) as u_30d
    FROM matomo_site s
    LEFT JOIN matomo_log_visit v ON s.idsite = v.idsite AND v.visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY s.idsite, s.name, s.main_url
    ORDER BY v_24h DESC, v_7d DESC, s.idsite ASC;
    """
    properties = run_query(properties_sql)

    # 2. Network-wide rollups
    network_sql = """
    SELECT 
        'Past 24 Hours' as period,
        COUNT(*) as visits,
        COUNT(DISTINCT idvisitor) as unique_visitors,
        IFNULL(SUM(visit_total_actions), 0) as total_actions,
        ROUND(IFNULL(AVG(visit_total_time), 0), 0) as avg_time,
        ROUND(IFNULL(SUM(CASE WHEN visit_total_actions = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 0), 1) as bounce_rate
    FROM matomo_log_visit
    WHERE visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    UNION ALL
    SELECT 
        'Past 7 Days (Total)' as period,
        COUNT(*) as visits,
        COUNT(DISTINCT idvisitor) as unique_visitors,
        IFNULL(SUM(visit_total_actions), 0) as total_actions,
        ROUND(IFNULL(AVG(visit_total_time), 0), 0) as avg_time,
        ROUND(IFNULL(SUM(CASE WHEN visit_total_actions = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 0), 1) as bounce_rate
    FROM matomo_log_visit
    WHERE visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    UNION ALL
    SELECT 
        'Past 30 Days (Total)' as period,
        COUNT(*) as visits,
        COUNT(DISTINCT idvisitor) as unique_visitors,
        IFNULL(SUM(visit_total_actions), 0) as total_actions,
        ROUND(IFNULL(AVG(visit_total_time), 0), 0) as avg_time,
        ROUND(IFNULL(SUM(CASE WHEN visit_total_actions = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) * 100, 0), 1) as bounce_rate
    FROM matomo_log_visit
    WHERE visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 30 DAY);
    """
    network_rollups = run_query(network_sql)

    # 3. Top Pages (Last 24 Hours) across all sites (clean paths without tokens/query strings)
    pages_sql = """
    SELECT 
        s.idsite,
        s.name as site_name,
        SUBSTRING_INDEX(a.name, '?', 1) as page_url, 
        COUNT(*) as pageviews,
        COUNT(DISTINCT l.idvisit) as unique_pageviews
    FROM matomo_log_link_visit_action l
    JOIN matomo_site s ON l.idsite = s.idsite
    JOIN matomo_log_action a ON l.idaction_url = a.idaction
    WHERE l.server_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      AND a.name NOT LIKE '%account.venmo.com%'
      AND a.name NOT LIKE '%paypal.com%'
    GROUP BY s.idsite, s.name, page_url
    ORDER BY pageviews DESC
    LIMIT 12;
    """
    top_pages = run_query(pages_sql)

    # 4. Traffic Channels & Referrers (Last 7 Days) (filtered of spam bot domains)
    referrers_sql = """
    SELECT 
        CASE 
            WHEN referer_type = 1 THEN 'Direct / Bookmarked'
            WHEN referer_type = 2 THEN CONCAT('Search: ', IFNULL(referer_name, 'Search Engine'))
            WHEN referer_type = 3 THEN CONCAT('Web Referral: ', IFNULL(referer_name, 'Website'))
            WHEN referer_type = 6 THEN CONCAT('Campaign: ', IFNULL(referer_name, 'Campaign'))
            ELSE 'Direct / Other'
        END as channel,
        COUNT(*) as visits,
        COUNT(DISTINCT idvisitor) as unique_visitors
    FROM matomo_log_visit
    WHERE visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND (referer_name IS NULL OR (
           referer_name NOT LIKE '%.online' 
       AND referer_name NOT LIKE '%.top' 
       AND referer_name NOT LIKE '%.xyz' 
       AND referer_name NOT LIKE '%.ru'
       AND referer_name NOT LIKE '%bot%'
       AND referer_name NOT LIKE '%crawler%'
      ))
    GROUP BY channel
    ORDER BY visits DESC
    LIMIT 8;
    """
    referrers = run_query(referrers_sql)

    # 5. Visitor Geography & Devices (Last 24 Hours)
    visitors_sql = """
    SELECT 
        CONCAT(IF(location_city IS NOT NULL AND location_city != '', location_city, 'Unknown City'), ', ', UPPER(IFNULL(location_country, 'US'))) as geo,
        IFNULL(config_browser_name, 'Browser') as browser,
        IFNULL(config_os, 'OS') as os,
        COUNT(*) as visits
    FROM matomo_log_visit
    WHERE visit_last_action_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY geo, browser, os
    ORDER BY visits DESC
    LIMIT 6;
    """
    visitors = run_query(visitors_sql)

    return {
        "properties": properties,
        "network_rollups": network_rollups,
        "top_pages": top_pages,
        "referrers": referrers,
        "visitors": visitors
    }


def build_email_content(data):
    """Builds both rich HTML and Plaintext email formats."""
    now = datetime.datetime.now()
    date_str = now.strftime("%A, %B %d, %Y")
    time_str = now.strftime("%I:%M %p %Z")

    net24 = data["network_rollups"][0] if len(data["network_rollups"]) > 0 else {}
    net7d = data["network_rollups"][1] if len(data["network_rollups"]) > 1 else {}
    net30d = data["network_rollups"][2] if len(data["network_rollups"]) > 2 else {}

    tot_visits_24h = int(net24.get("visits", 0) or 0)
    tot_uniques_24h = int(net24.get("unique_visitors", 0) or 0)
    tot_actions_24h = int(net24.get("total_actions", 0) or 0)
    tot_bounce_24h = float(net24.get("bounce_rate", 0.0) or 0.0)
    avg_dur_24h = format_duration(net24.get("avg_time", 0))

    # Build Properties HTML Rows
    prop_rows_html = ""
    for p in data["properties"]:
        v24 = int(p.get("v_24h", 0) or 0)
        u24 = int(p.get("u_24h", 0) or 0)
        a24 = int(p.get("a_24h", 0) or 0)
        v7d = int(p.get("v_7d", 0) or 0)
        v30d = int(p.get("v_30d", 0) or 0)
        dur = format_duration(p.get("avg_time_24h", 0))
        bounce = f"{int(float(p.get('bounce_24h', 0) or 0))}%" if v24 > 0 else "-"
        site_id = p["idsite"]
        name = p["name"]
        url = p["main_url"].replace("https://", "").replace("http://", "")

        is_active = v24 > 0
        row_bg = "background-color: #f8fafc;" if is_active else "opacity: 0.85;"
        badge = "<span style='display:inline-block; width:8px; height:8px; background-color:#10b981; border-radius:50%; margin-right:6px;'></span>" if is_active else "<span style='display:inline-block; width:8px; height:8px; background-color:#94a3b8; border-radius:50%; margin-right:6px;'></span>"
        v24_display = f"<strong style='color:#0f172a;'>{v24}</strong>" if is_active else "<span style='color:#94a3b8;'>0</span>"
        u24_display = f"<strong>{u24}</strong>" if is_active else "<span style='color:#94a3b8;'>0</span>"
        a24_display = f"<span style='color:#2563eb; font-weight:700;'>{a24}</span>" if is_active else "<span style='color:#94a3b8;'>0</span>"

        matomo_link = f"{MATOMO_BASE_URL}/index.php?module=CoreHome&action=index&idSite={site_id}&period=day&date=today"

        prop_rows_html += f"""
        <tr style="border-bottom: 1px solid #e2e8f0; {row_bg}">
          <td style="padding: 12px 10px; font-size: 13px;">
            {badge}<strong>{name}</strong><br>
            <span style="color: #64748b; font-size: 11px; margin-left: 14px;">{url} &bull; </span><a href="{matomo_link}" style="color:#2563eb; font-size: 11px; text-decoration: none; font-weight: 600;">View in Matomo &rarr;</a>
          </td>
          <td style="padding: 12px 8px; text-align: center; font-size: 13px;">{v24_display}</td>
          <td style="padding: 12px 8px; text-align: center; font-size: 13px;">{u24_display}</td>
          <td style="padding: 12px 8px; text-align: center; font-size: 13px;">{a24_display}</td>
          <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: #475569;">{dur}</td>
          <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: #475569;">{bounce}</td>
          <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: #64748b;">{v7d}</td>
          <td style="padding: 12px 8px; text-align: right; font-size: 12px; color: #64748b;">{v30d}</td>
        </tr>
        """

    # Build Top Pages HTML Rows
    pages_html = ""
    if data["top_pages"]:
        for p in data["top_pages"]:
            clean_url = re.sub(r'^https?://', '', p["page_url"])
            if len(clean_url) > 60:
                clean_url = clean_url[:57] + "..."
            pages_html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 10px; font-size: 12px; font-weight: 600; color: #0f172a;">
                <span style="display: inline-block; background: #e2e8f0; color: #334155; font-size: 10px; padding: 1px 6px; border-radius: 4px; margin-right: 6px;">{p['site_name']}</span>
                <span style="font-family: monospace; color: #1e293b;">{clean_url}</span>
              </td>
              <td style="padding: 8px 10px; text-align: right; font-size: 12px; font-weight: 700; color: #2563eb;">{p['pageviews']}</td>
              <td style="padding: 8px 10px; text-align: right; font-size: 12px; color: #64748b;">{p['unique_pageviews']}</td>
            </tr>
            """
    else:
        pages_html = "<tr><td colspan='3' style='padding:16px; text-align:center; color:#94a3b8; font-size:12px;'>No page views recorded in the last 24 hours.</td></tr>"

    # Build Referrers HTML Rows
    ref_html = ""
    if data["referrers"]:
        for r in data["referrers"]:
            ref_html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 10px; font-size: 12px; color: #334155;"><strong>{r['channel']}</strong></td>
              <td style="padding: 8px 10px; text-align: right; font-size: 12px; font-weight: 700; color: #0f172a;">{r['visits']}</td>
              <td style="padding: 8px 10px; text-align: right; font-size: 12px; color: #64748b;">{r['unique_visitors']}</td>
            </tr>
            """
    else:
        ref_html = "<tr><td colspan='3' style='padding:16px; text-align:center; color:#94a3b8; font-size:12px;'>No external traffic logged.</td></tr>"

    # Build Visitor Geography & Device Rows
    vis_html = ""
    if data["visitors"]:
        for v in data["visitors"]:
            vis_html += f"""
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 10px; font-size: 12px; color: #334155;">📍 {v['geo']}</td>
              <td style="padding: 8px 10px; font-size: 12px; color: #64748b;">💻 {v['browser']} &bull; {v['os']}</td>
              <td style="padding: 8px 10px; text-align: right; font-size: 12px; font-weight: 700; color: #0f172a;">{v['visits']}</td>
            </tr>
            """
    else:
        vis_html = "<tr><td colspan='3' style='padding:16px; text-align:center; color:#94a3b8; font-size:12px;'>No geography data available.</td></tr>"

    # Assemble HTML Email
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Matomo Multi-Property Analytics Daily Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 720px; margin: 20px auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid #334155;">
    
    <!-- Top Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 26px 24px; border-bottom: 3px solid #3b82f6; text-align: center;">
      <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: #60a5fa; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
        📊 MATOMO ON-PREMISE ANALYTICS &bull; ECOSYSTEM INTELLIGENCE
      </div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
        Daily Property Performance Briefing
      </h1>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">
        {date_str} &bull; Generated at {time_str}
      </div>
    </div>

    <!-- Executive Network Snapshot KPI Cards -->
    <div style="padding: 24px 20px 10px 20px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px;">
        ⚡ Network 24-Hour Rollup
      </div>
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 20px;">
        <tr>
          <td style="width: 25%; text-align: center; padding: 14px 6px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
            <span style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Visits (24h)</span>
            <span style="display: block; font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 4px;">{tot_visits_24h}</span>
            <span style="display: block; font-size: 10px; color: #10b981; font-weight: 600; margin-top: 2px;">{net7d.get('visits', 0)} / 7d</span>
          </td>
          <td style="width: 25%; text-align: center; padding: 14px 6px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
            <span style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Unique Visitors</span>
            <span style="display: block; font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 4px;">{tot_uniques_24h}</span>
            <span style="display: block; font-size: 10px; color: #64748b; margin-top: 2px;">{net7d.get('unique_visitors', 0)} in 7d</span>
          </td>
          <td style="width: 25%; text-align: center; padding: 14px 6px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
            <span style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Actions / Views</span>
            <span style="display: block; font-size: 24px; font-weight: 900; color: #2563eb; margin-top: 4px;">{tot_actions_24h}</span>
            <span style="display: block; font-size: 10px; color: #64748b; margin-top: 2px;">{net7d.get('total_actions', 0)} in 7d</span>
          </td>
          <td style="width: 25%; text-align: center; padding: 14px 6px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;">
            <span style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Avg Visit / Bounce</span>
            <span style="display: block; font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 6px;">{avg_dur_24h}</span>
            <span style="display: block; font-size: 11px; color: #f59e0b; font-weight: 700; margin-top: 2px;">{tot_bounce_24h:.0f}% bounce</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Properties Breakdown Section (The Core Request) -->
    <div style="padding: 0 20px 20px 20px;">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
        🌐 Property-by-Property Analytics Breakdown
      </div>
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #475569; font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">
              <th style="padding: 10px 10px; text-align: left;">Web Property</th>
              <th style="padding: 10px 8px; text-align: center;">24h Visits</th>
              <th style="padding: 10px 8px; text-align: center;">24h Unique</th>
              <th style="padding: 10px 8px; text-align: center;">24h Actions</th>
              <th style="padding: 10px 8px; text-align: center;">Avg Time</th>
              <th style="padding: 10px 8px; text-align: center;">Bounce</th>
              <th style="padding: 10px 8px; text-align: center;">7d Total</th>
              <th style="padding: 10px 8px; text-align: right;">30d Total</th>
            </tr>
          </thead>
          <tbody>
            {prop_rows_html}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Top Pages (24h) -->
    <div style="padding: 0 20px 20px 20px;">
      <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
        📄 Most Active Content &amp; Pages (Last 24 Hours)
      </div>
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #475569; font-size: 10px; text-transform: uppercase; font-weight: 700;">
              <th style="padding: 8px 10px; text-align: left;">Page / Resource</th>
              <th style="padding: 8px 10px; text-align: right;">Views</th>
              <th style="padding: 8px 10px; text-align: right;">Unique</th>
            </tr>
          </thead>
          <tbody>
            {pages_html}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Acquisition & Traffic Sources + Devices Grid -->
    <div style="padding: 0 20px 24px 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <!-- Channels -->
          <td style="width: 50%; vertical-align: top; padding-right: 8px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin-bottom: 6px;">
              🧭 Acquisition Channels (7d)
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background-color: #f1f5f9; color: #475569; font-size: 9px; text-transform: uppercase;">
                    <th style="padding: 6px 8px; text-align: left;">Channel</th>
                    <th style="padding: 6px 8px; text-align: right;">Visits</th>
                    <th style="padding: 6px 8px; text-align: right;">Uniques</th>
                  </tr>
                </thead>
                <tbody>
                  {ref_html}
                </tbody>
              </table>
            </div>
          </td>
          <!-- Geography & Devices -->
          <td style="width: 50%; vertical-align: top; padding-left: 8px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin-bottom: 6px;">
              🌍 Locations &amp; Tech (24h)
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background-color: #f1f5f9; color: #475569; font-size: 9px; text-transform: uppercase;">
                    <th style="padding: 6px 8px; text-align: left;">Location</th>
                    <th style="padding: 6px 8px; text-align: left;">Platform</th>
                    <th style="padding: 6px 8px; text-align: right;">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {vis_html}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Action Bar & Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
      <a href="{MATOMO_BASE_URL}" 
         style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 800; font-size: 12px; text-decoration: none; padding: 10px 20px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">
        🚀 Open Live Matomo Dashboard &rarr;
      </a>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 14px; line-height: 1.5;">
        Automated Daily Intelligence Briefing &bull; Delivered every morning at 7:00 AM EDT<br>
        Host: <a href="https://wallyatkins.com" style="color: #64748b; text-decoration: none;">wallyatkins.com</a> &bull; Privacy-friendly on-premise Matomo 5.7.1
      </div>
    </div>

  </div>
</body>
</html>"""

    # Plaintext Email Alternative
    plain = f"""================================================================================
           MATOMO MULTI-PROPERTY ANALYTICS DAILY INTELLIGENCE REPORT
                        {date_str} ({time_str})
================================================================================

⚡ NETWORK 24-HOUR ROLLUP:
- Total Visits (24h):     {tot_visits_24h} (7-Day Total: {net7d.get('visits', 0)})
- Unique Visitors:        {tot_uniques_24h}
- Actions / Pageviews:    {tot_actions_24h}
- Avg Visit Duration:     {avg_dur_24h}
- Network Bounce Rate:    {tot_bounce_24h:.0f}%

🌐 PROPERTY-BY-PROPERTY BREAKDOWN:
"""
    for p in data["properties"]:
        v24 = int(p.get("v_24h", 0) or 0)
        u24 = int(p.get("u_24h", 0) or 0)
        a24 = int(p.get("a_24h", 0) or 0)
        v7d = int(p.get("v_7d", 0) or 0)
        v30d = int(p.get("v_30d", 0) or 0)
        dur = format_duration(p.get("avg_time_24h", 0))
        plain += f"• {p['name']} (Site {p['idsite']}):\n"
        plain += f"    24h: {v24} visits | {u24} uniques | {a24} views | Avg: {dur}\n"
        plain += f"    7d:  {v7d} visits  | 30d: {v30d} visits\n"
        plain += f"    URL: {p['main_url']}\n\n"

    plain += "📄 TOP PAGES (LAST 24 HOURS):\n"
    for p in data["top_pages"][:10]:
        clean_p = re.sub(r'^https?://', '', p['page_url'])
        plain += f"• [{p['site_name']}] {clean_p}: {p['pageviews']} views ({p['unique_pageviews']} unique)\n"

    plain += "\n🧭 TRAFFIC CHANNELS (LAST 7 DAYS):\n"
    for r in data["referrers"]:
        plain += f"• {r['channel']}: {r['visits']} visits ({r['unique_visitors']} unique)\n"

    plain += f"\nFull Console: {MATOMO_BASE_URL}\n"
    plain += "================================================================================\n"

    return plain, html, date_str


def send_report(recipients=None, test_to=None, dry_run=False):
    """Generates analytics data and dispatches report to target email addresses."""
    target_recipients = [test_to.strip()] if test_to else (recipients or DEFAULT_RECIPIENTS)
    
    print(f"[{datetime.datetime.now()}] Gathering Matomo multi-property analytics data...")
    data = generate_analytics_data()
    plain, html, date_str = build_email_content(data)

    subject = f"📊 Daily Matomo Analytics: Multi-Property Briefing ({date_str})"

    if dry_run:
        print(f"[{datetime.datetime.now()}] [DRY-RUN] Prepared report for: {', '.join(target_recipients)}")
        print(f"[{datetime.datetime.now()}] [DRY-RUN] Subject: {subject}")
        print(plain)
        return True

    success_all = True

    for recipient in target_recipients:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{FROM_NAME} <{FROM_EMAIL}>"
        msg['To'] = recipient
        msg['Reply-To'] = FROM_EMAIL
        msg['Date'] = email.utils.formatdate(localtime=True)
        msg['Message-ID'] = email.utils.make_msgid(domain='wallyatkins.com')
        msg['X-Mailer'] = "WallyAtkins-Matomo-Intelligence/2.0"
        msg['Auto-Submitted'] = "auto-generated"

        msg.attach(MIMEText(plain, 'plain', 'utf-8'))
        msg.attach(MIMEText(html, 'html', 'utf-8'))

        # Delivery Attempt 1: Authenticated TLS SMTP
        smtp_success = False
        try:
            ctx = ssl.create_default_context()
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as server:
                server.starttls(context=ctx)
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            print(f"[{datetime.datetime.now()}] Successfully sent Matomo report via SMTP to {recipient}")
            smtp_success = True
        except Exception as e:
            print(f"[{datetime.datetime.now()}] SMTP delivery to {recipient} failed: {e}. Falling back to sendmail...", file=sys.stderr)

        if not smtp_success:
            # Delivery Attempt 2: Local sendmail fallback
            try:
                p = subprocess.Popen(
                    ['/usr/sbin/sendmail', '-t', '-i', '-f', FROM_EMAIL],
                    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
                )
                stdout, stderr = p.communicate(msg.as_bytes())
                if p.returncode == 0:
                    print(f"[{datetime.datetime.now()}] Successfully sent Matomo report via sendmail fallback to {recipient}")
                else:
                    print(f"[{datetime.datetime.now()}] Sendmail fallback failed for {recipient} (exit {p.returncode}): {stderr.decode()}", file=sys.stderr)
                    success_all = False
            except Exception as e:
                print(f"[{datetime.datetime.now()}] Exception executing sendmail fallback: {e}", file=sys.stderr)
                success_all = False

    return success_all


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Send Daily Multi-Property Matomo Analytics Email")
    parser.add_argument("--test-to", dest="test_to", default=None, help="Send only to this test email address")
    parser.add_argument("--dry-run", dest="dry_run", action="store_true", help="Print report to console without sending")
    args = parser.parse_args()

    success = send_report(test_to=args.test_to, dry_run=args.dry_run)
    sys.exit(0 if success else 1)
