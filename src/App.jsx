import React, { useState, useRef } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area
} from "recharts";

// ── Users (all roles) ─────────────────────────────────────────────────────────
const ALL_USERS = [
  { id:"edo-1",  name:"Sarah Mitchell",    title:"Executive Director of Operations", email:"s.mitchell@marketplaceministries.org", avatar:"SM", region:"Southeast", vpName:"David Huang",    role:"EDO"      },
  { id:"edo-2",  name:"James Okafor",      title:"Executive Director of Operations", email:"j.okafor@marketplaceministries.org",  avatar:"JO", region:"Midwest",   vpName:"Rachel Torres", role:"EDO"      },
  { id:"edo-3",  name:"Linda Castillo",    title:"VP of Client Operations",          email:"l.castillo@marketplaceministries.org",avatar:"LC", region:"Southwest",  vpName:"David Huang",   role:"EDO"      },
  { id:"vp-1",   name:"David Huang",       title:"Vice President of Operations",     email:"d.huang@marketplaceministries.org",   avatar:"DH", region:"National",   vpName:"",              role:"VP"       },
  { id:"vp-2",   name:"Rachel Torres",     title:"Vice President of Client Success", email:"r.torres@marketplaceministries.org",  avatar:"RT", region:"National",   vpName:"",              role:"VP"       },
  { id:"exec-1", name:"Jane Doe",          title:"Chief Executive Officer",          email:"j.doe@marketplaceministries.org",     avatar:"JD", region:"National",   vpName:"",              role:"Exec"     },
  { id:"chap-1", name:"Rev. Thomas Moore", title:"Chaplain — Southeast Region",      email:"t.moore@marketplaceministries.org",   avatar:"TM", region:"Southeast",  vpName:"Sarah Mitchell",role:"Chaplain" },
  { id:"chap-2", name:"Chap. Diana Allen", title:"Chaplain — Southeast Region",      email:"d.allen@marketplaceministries.org",   avatar:"DA", region:"Southeast",  vpName:"Sarah Mitchell",role:"Chaplain" },
];

// ── Language strings ──────────────────────────────────────────────────────────
const LANG = {
  en: { signIn:"Sign in with your organization account", secured:"Secured via Microsoft Azure AD SSO", signOut:"Sign Out", portalName:"EDO Portal",    roleEDO:"EDO", roleVP:"VP", roleExec:"Exec", roleChaplain:"Chaplain" },
  es: { signIn:"Inicia sesión con tu cuenta de organización", secured:"Protegido por Microsoft Azure AD SSO", signOut:"Cerrar Sesión", portalName:"Portal EDO",    roleEDO:"EDO", roleVP:"VP", roleExec:"Ejec.", roleChaplain:"Capellán" },
  fr: { signIn:"Connectez-vous avec votre compte d'organisation", secured:"Sécurisé via Microsoft Azure AD SSO", signOut:"Déconnexion", portalName:"Portail EDO",   roleEDO:"EDO", roleVP:"VP", roleExec:"Dir.",  roleChaplain:"Aumônier" },
};

// ── Mock CRM Clients ──────────────────────────────────────────────────────────
const CRM_CLIENTS = {
  "edo-1": [
    { id:"c1", name:"Acme Manufacturing",   logo:"AM", color:"#1a4a7a", industry:"Manufacturing",      employees:1240, chaplains:4, chaplainNames:["Rev. T. Moore","Chap. D. Allen","Chap. R. Singh","Chap. L. Park"],
      contact:"Greg Hartley",   contactTitle:"VP of HR",              contactEmail:"g.hartley@acmemfg.com",
      lastReport:"2025-01-15",  nextDue:"2025-04-15", health:"green",  healthLabel:"On Track",       engagementScore:87, trend:"up",
      recentActivity:"Q4 ECR delivered. Leadership praised chaplain visibility initiative.",
      chaplainVisits:[{month:"Aug",v:142},{month:"Sep",v:168},{month:"Oct",v:155},{month:"Nov",v:189},{month:"Dec",v:134},{month:"Jan",v:201}] },
    { id:"c2", name:"Sunrise Health Systems",logo:"SH", color:"#0e6655", industry:"Healthcare",         employees:3800, chaplains:9, chaplainNames:["Rev. C. Davis","Chap. M. Osei","Chap. A. Kim","Chap. P. Ruiz","Chap. B. White"],
      contact:"Patricia Yuen",  contactTitle:"Chief People Officer",  contactEmail:"p.yuen@sunrisehealth.org",
      lastReport:"2024-12-20",  nextDue:"2025-03-20", health:"yellow", healthLabel:"Report Due Soon", engagementScore:74, trend:"up",
      recentActivity:"Follow-up needed on Q3 feedback. CPO requested expanded mental health data.",
      chaplainVisits:[{month:"Aug",v:310},{month:"Sep",v:328},{month:"Oct",v:301},{month:"Nov",v:355},{month:"Dec",v:289},{month:"Jan",v:372}] },
    { id:"c3", name:"BlueStar Logistics",    logo:"BL", color:"#b7410e", industry:"Logistics",           employees:670,  chaplains:2, chaplainNames:["Chap. F. Johnson","Chap. H. Nguyen"],
      contact:"Marcus Webb",    contactTitle:"HR Director",            contactEmail:"m.webb@bluestarlog.com",
      lastReport:"2024-11-10",  nextDue:"2025-02-10", health:"red",    healthLabel:"Overdue",         engagementScore:58, trend:"down",
      recentActivity:"Report overdue 3 weeks. Contact attempted twice — awaiting response from Marcus.",
      chaplainVisits:[{month:"Aug",v:61},{month:"Sep",v:74},{month:"Oct",v:68},{month:"Nov",v:55},{month:"Dec",v:42},{month:"Jan",v:38}] },
    { id:"c4", name:"Cornerstone Financial", logo:"CF", color:"#4a235a", industry:"Financial Services",  employees:450,  chaplains:2, chaplainNames:["Rev. G. Brown","Chap. S. Lee"],
      contact:"Anne Driscoll",  contactTitle:"SVP Human Resources",   contactEmail:"a.driscoll@cornerstonefin.com",
      lastReport:"2025-01-28",  nextDue:"2025-04-28", health:"green",  healthLabel:"On Track",       engagementScore:92, trend:"up",
      recentActivity:"Strongest engagement score in region. Client renewed 3-year contract in January.",
      chaplainVisits:[{month:"Aug",v:41},{month:"Sep",v:48},{month:"Oct",v:52},{month:"Nov",v:59},{month:"Dec",v:44},{month:"Jan",v:63}] },
  ],
  "edo-2": [
    { id:"c5", name:"Pinnacle Logistics",    logo:"PL", color:"#6c3483", industry:"Logistics",           employees:920,  chaplains:3, chaplainNames:["Rev. K. Thomas","Chap. A. Flores","Chap. J. Reed"],
      contact:"Steve Novak",    contactTitle:"Director of People Ops", contactEmail:"s.novak@pinnlog.com",
      lastReport:"2025-01-05",  nextDue:"2025-04-05", health:"green",  healthLabel:"On Track",       engagementScore:81, trend:"stable",
      recentActivity:"Q4 report well received. Steve requested a chaplain visibility event for Q1.",
      chaplainVisits:[{month:"Aug",v:88},{month:"Sep",v:94},{month:"Oct",v:91},{month:"Nov",v:103},{month:"Dec",v:79},{month:"Jan",v:110}] },
    { id:"c6", name:"Heartland Foods Co.",   logo:"HF", color:"#1e7145", industry:"Food & Beverage",     employees:2100, chaplains:6, chaplainNames:["Rev. D. Carter","Chap. L. Gomez","Chap. T. Wilson","Chap. N. Harris"],
      contact:"Diane Marsh",    contactTitle:"VP of Operations",       contactEmail:"d.marsh@heartlandfoods.com",
      lastReport:"2025-02-01",  nextDue:"2025-05-01", health:"green",  healthLabel:"On Track",       engagementScore:79, trend:"up",
      recentActivity:"New shift added at Omaha facility — chaplain coverage being expanded.",
      chaplainVisits:[{month:"Aug",v:198},{month:"Sep",v:210},{month:"Oct",v:205},{month:"Nov",v:224},{month:"Dec",v:187},{month:"Jan",v:231}] },
    { id:"c7", name:"Great Plains Auto Group",logo:"GP",color:"#7d3c0a", industry:"Automotive",          employees:380,  chaplains:1, chaplainNames:["Chap. R. Martinez"],
      contact:"Terry Billings", contactTitle:"GM / Owner",             contactEmail:"t.billings@gpag.com",
      lastReport:"2024-10-30",  nextDue:"2025-01-30", health:"red",    healthLabel:"Overdue",         engagementScore:44, trend:"down",
      recentActivity:"Relationship at risk. Owner had ownership transition — new contact TBD.",
      chaplainVisits:[{month:"Aug",v:32},{month:"Sep",v:29},{month:"Oct",v:27},{month:"Nov",v:24},{month:"Dec",v:18},{month:"Jan",v:14}] },
  ],
  "edo-3": [
    { id:"c8", name:"Desert Sun Energy",     logo:"DS", color:"#c0392b", industry:"Energy",              employees:1560, chaplains:5, chaplainNames:["Rev. P. Jackson","Chap. M. Chen","Chap. E. Diaz","Chap. B. Scott"],
      contact:"Carlos Reyes",   contactTitle:"Chief HR Officer",       contactEmail:"c.reyes@desertsun.com",
      lastReport:"2025-01-22",  nextDue:"2025-04-22", health:"green",  healthLabel:"On Track",       engagementScore:83, trend:"up",
      recentActivity:"Chaplain team expanded to cover new Tucson site. Q4 report delivered on time.",
      chaplainVisits:[{month:"Aug",v:144},{month:"Sep",v:158},{month:"Oct",v:163},{month:"Nov",v:177},{month:"Dec",v:151},{month:"Jan",v:184}] },
    { id:"c9", name:"Rio Verde Hospital",    logo:"RV", color:"#0a5e6d", industry:"Healthcare",           employees:2400, chaplains:7, chaplainNames:["Rev. A. Thompson","Chap. C. Patel","Chap. J. Rivera","Chap. S. Kim","Chap. D. Evans"],
      contact:"Nina Pearce",    contactTitle:"VP of Patient Experience",contactEmail:"n.pearce@rioverde.org",
      lastReport:"2024-12-15",  nextDue:"2025-03-15", health:"yellow", healthLabel:"Report Due Soon", engagementScore:71, trend:"stable",
      recentActivity:"Nina requested sentiment data broken out by nursing vs. admin staff for Q1 report.",
      chaplainVisits:[{month:"Aug",v:221},{month:"Sep",v:238},{month:"Oct",v:229},{month:"Nov",v:251},{month:"Dec",v:204},{month:"Jan",v:263}] },
  ],
  // VPs and Exec see all clients
  "vp-1":   null,
  "vp-2":   null,
  "exec-1": null,
  // Chaplains see their assigned clients only
  "chap-1": [
    { id:"c1", name:"Acme Manufacturing",  logo:"AM", color:"#1a4a7a", industry:"Manufacturing",    employees:1240, chaplains:4, chaplainNames:["Rev. T. Moore","Chap. D. Allen","Chap. R. Singh","Chap. L. Park"],
      contact:"Greg Hartley",  contactTitle:"VP of HR",            contactEmail:"g.hartley@acmemfg.com",
      lastReport:"2025-01-15", nextDue:"2025-04-15", health:"green",  healthLabel:"On Track",       engagementScore:87, trend:"up",
      recentActivity:"Q4 ECR delivered. Leadership praised chaplain visibility initiative.",
      chaplainVisits:[{month:"Aug",v:142},{month:"Sep",v:168},{month:"Oct",v:155},{month:"Nov",v:189},{month:"Dec",v:134},{month:"Jan",v:201}] },
  ],
  "chap-2": [
    { id:"c3", name:"BlueStar Logistics",  logo:"BL", color:"#b7410e", industry:"Logistics",         employees:670,  chaplains:2, chaplainNames:["Chap. F. Johnson","Chap. H. Nguyen"],
      contact:"Marcus Webb",   contactTitle:"HR Director",          contactEmail:"m.webb@bluestarlog.com",
      lastReport:"2024-11-10", nextDue:"2025-02-10", health:"red",    healthLabel:"Overdue",         engagementScore:58, trend:"down",
      recentActivity:"Report overdue 3 weeks. Contact attempted twice — awaiting response from Marcus.",
      chaplainVisits:[{month:"Aug",v:61},{month:"Sep",v:74},{month:"Oct",v:68},{month:"Nov",v:55},{month:"Dec",v:42},{month:"Jan",v:38}] },
  ],
};

// All clients flattened for VP/Exec
const ALL_CLIENTS_FLAT = [
  ...CRM_CLIENTS["edo-1"],
  ...CRM_CLIENTS["edo-2"],
  ...CRM_CLIENTS["edo-3"],
];

function getClientsForUser(user) {
  if (!user) return [];
  if (user.role === "VP" || user.role === "Exec") return ALL_CLIENTS_FLAT;
  return CRM_CLIENTS[user.id] || [];
}



// ── ECR Report Builder Data ───────────────────────────────────────────────────
const ECR_MOCK = {
  interactions: [
    { month:"Aug", visits:142, followups:38 },
    { month:"Sep", visits:168, followups:45 },
    { month:"Oct", visits:155, followups:41 },
    { month:"Nov", visits:189, followups:52 },
    { month:"Dec", visits:134, followups:29 },
    { month:"Jan", visits:201, followups:61 },
  ],
  interactionDrilldown: {
    Aug:[{week:"Wk 1",visits:34,followups:9},{week:"Wk 2",visits:38,followups:11},{week:"Wk 3",visits:36,followups:8},{week:"Wk 4",visits:34,followups:10}],
    Sep:[{week:"Wk 1",visits:39,followups:10},{week:"Wk 2",visits:44,followups:12},{week:"Wk 3",visits:41,followups:11},{week:"Wk 4",visits:44,followups:12}],
    Oct:[{week:"Wk 1",visits:37,followups:9},{week:"Wk 2",visits:41,followups:11},{week:"Wk 3",visits:38,followups:10},{week:"Wk 4",visits:39,followups:11}],
    Nov:[{week:"Wk 1",visits:44,followups:13},{week:"Wk 2",visits:50,followups:14},{week:"Wk 3",visits:47,followups:12},{week:"Wk 4",visits:48,followups:13}],
    Dec:[{week:"Wk 1",visits:38,followups:9},{week:"Wk 2",visits:36,followups:8},{week:"Wk 3",visits:30,followups:6},{week:"Wk 4",visits:30,followups:6}],
    Jan:[{week:"Wk 1",visits:46,followups:14},{week:"Wk 2",visits:52,followups:16},{week:"Wk 3",visits:50,followups:15},{week:"Wk 4",visits:53,followups:16}],
  },
  sentiment:[
    { category:"Highly Positive", value:34, color:"#27ae60" },
    { category:"Positive",        value:41, color:"#82c341" },
    { category:"Neutral",         value:15, color:"#f39c12" },
    { category:"Needs Support",   value:10, color:"#e74c3c" },
  ],
  sentimentDrilldown:{
    "Highly Positive":[{dept:"Operations",pct:40},{dept:"Admin",pct:35},{dept:"Warehouse",pct:28},{dept:"Sales",pct:42},{dept:"Other",pct:31}],
    "Positive":       [{dept:"Operations",pct:38},{dept:"Admin",pct:44},{dept:"Warehouse",pct:45},{dept:"Sales",pct:36},{dept:"Other",pct:40}],
    "Neutral":        [{dept:"Operations",pct:14},{dept:"Admin",pct:13},{dept:"Warehouse",pct:18},{dept:"Sales",pct:14},{dept:"Other",pct:20}],
    "Needs Support":  [{dept:"Operations",pct:8}, {dept:"Admin",pct:8}, {dept:"Warehouse",pct:9}, {dept:"Sales",pct:8}, {dept:"Other",pct:9}],
  },
  demographics:[
    { dept:"Operations", pct:38 },
    { dept:"Admin",      pct:22 },
    { dept:"Warehouse",  pct:19 },
    { dept:"Sales",      pct:13 },
    { dept:"Other",      pct:8  },
  ],
  demographicDrilldown:{
    Operations:[{month:"Aug",v:54},{month:"Sep",v:63},{month:"Oct",v:59},{month:"Nov",v:72},{month:"Dec",v:51},{month:"Jan",v:76}],
    Admin:     [{month:"Aug",v:31},{month:"Sep",v:37},{month:"Oct",v:34},{month:"Nov",v:41},{month:"Dec",v:29},{month:"Jan",v:44}],
    Warehouse: [{month:"Aug",v:27},{month:"Sep",v:32},{month:"Oct",v:29},{month:"Nov",v:36},{month:"Dec",v:25},{month:"Jan",v:38}],
    Sales:     [{month:"Aug",v:18},{month:"Sep",v:22},{month:"Oct",v:20},{month:"Nov",v:25},{month:"Dec",v:17},{month:"Jan",v:27}],
    Other:     [{month:"Aug",v:12},{month:"Sep",v:14},{month:"Oct",v:13},{month:"Nov",v:15},{month:"Dec",v:12},{month:"Jan",v:16}],
  },
  crisis:[
    { type:"Grief / Loss",  count:14 },
    { type:"Family Crisis", count:9  },
    { type:"Financial",     count:7  },
    { type:"Medical",       count:11 },
    { type:"Mental Health", count:6  },
  ],
  crisisDrilldown:{
    "Grief / Loss": { trend:[{month:"Aug",v:2},{month:"Sep",v:3},{month:"Oct",v:2},{month:"Nov",v:3},{month:"Dec",v:2},{month:"Jan",v:2}], note:"Majority involve loss of a family member or close colleague. 10 of 14 received follow-up chaplain visits. 4 referred to grief counseling." },
    "Family Crisis":{ trend:[{month:"Aug",v:1},{month:"Sep",v:2},{month:"Oct",v:1},{month:"Nov",v:2},{month:"Dec",v:1},{month:"Jan",v:2}], note:"Cases span divorce proceedings, child custody concerns, and caregiver stress. All 9 received at least 2 chaplain touchpoints." },
    "Financial":    { trend:[{month:"Aug",v:1},{month:"Sep",v:1},{month:"Oct",v:1},{month:"Nov",v:2},{month:"Dec",v:1},{month:"Jan",v:1}], note:"Common themes include debt stress and unexpected medical expenses. 5 referred to EAP financial counseling resources." },
    "Medical":      { trend:[{month:"Aug",v:2},{month:"Sep",v:2},{month:"Oct",v:2},{month:"Nov",v:2},{month:"Dec",v:1},{month:"Jan",v:2}], note:"Cases involve personal diagnosis (6) and family member illness (5). Chaplains provided consistent presence throughout treatment." },
    "Mental Health":{ trend:[{month:"Aug",v:1},{month:"Sep",v:1},{month:"Oct",v:1},{month:"Nov",v:1},{month:"Dec",v:1},{month:"Jan",v:1}], note:"All 6 cases involved proactive referral to licensed counseling. Zero crisis escalations during period." },
  },
  kpis:[
    { label:"Total Interactions", value:"989",     delta:"+12%", positive:true,  key:"interactions" },
    { label:"Employees Served",   value:"412",     delta:"+8%",  positive:true,  key:"employees"    },
    { label:"Avg Response Time",  value:"1.4 hrs", delta:"-18%", positive:true,  key:"response"     },
    { label:"Crisis Referrals",   value:"47",      delta:"+3",   positive:false, key:"crisis_kpi"   },
  ],
  kpiDrilldown:{
    interactions:{ trend:[{month:"Aug",v:142},{month:"Sep",v:168},{month:"Oct",v:155},{month:"Nov",v:189},{month:"Dec",v:134},{month:"Jan",v:201}], note:"Interaction volume peaked in January, driven by post-holiday re-engagement. November spike correlates with facility-wide chaplain awareness campaign." },
    employees:   { trend:[{month:"Aug",v:312},{month:"Sep",v:334},{month:"Oct",v:341},{month:"Nov",v:378},{month:"Dec",v:298},{month:"Jan",v:412}], note:"Unique employees served grew 8% period-over-period. January's record reflects new shift coverage added at the Northside facility." },
    response:    { trend:[{month:"Aug",v:2.1},{month:"Sep",v:1.9},{month:"Oct",v:1.8},{month:"Nov",v:1.6},{month:"Dec",v:1.5},{month:"Jan",v:1.4}], note:"Consistent improvement across all 6 months. Chaplain scheduling optimization implemented in October accounts for the steepest drop." },
    crisis_kpi:  { trend:[{month:"Aug",v:6},{month:"Sep",v:8},{month:"Oct",v:7},{month:"Nov",v:9},{month:"Dec",v:8},{month:"Jan",v:9}], note:"Crisis referrals are slightly elevated vs prior period. This reflects improved chaplain identification of at-risk employees — a positive outcome of training." },
  },
};

const ECR_BLOCK_LIBRARY = [
  { type:"kpi_row",      label:"KPI Summary Row",    icon:"📊", category:"Data"    },
  { type:"interactions", label:"Interaction Trends", icon:"📈", category:"Data"    },
  { type:"sentiment",    label:"Employee Sentiment", icon:"💛", category:"Data"    },
  { type:"demographics", label:"Dept. Breakdown",    icon:"🏢", category:"Data"    },
  { type:"crisis",       label:"Crisis & Referrals", icon:"🤝", category:"Data"    },
  { type:"pulse_report", label:"Pulse Report",       icon:"💓", category:"Data"    },
  { type:"text_block",   label:"Narrative / Text",   icon:"📝", category:"Content" },
  { type:"image_block",  label:"Image / Logo",       icon:"🖼️", category:"Content" },
  { type:"divider",      label:"Section Divider",    icon:"➖", category:"Layout"  },
  { type:"cover_slide",  label:"Cover Slide",        icon:"🎯", category:"Layout"  },
];

// ── Pulse Report Data Model ───────────────────────────────────────────────────
const PULSE_CATEGORIES = [
  { key:"workplace",    label:"Workplace Policy",    short:"Workplace", icon:"🏭" },
  { key:"benefits",     label:"Benefits",             short:"Benefits",  icon:"💊" },
  { key:"management",   label:"Management",           short:"Mgmt",      icon:"👔" },
  { key:"compensation", label:"Compensation",         short:"Comp.",     icon:"💰" },
  { key:"safety",       label:"Safety",               short:"Safety",    icon:"🦺" },
  { key:"community",    label:"Community",            short:"Community", icon:"🤝" },
  { key:"morale",       label:"Overall Morale",       short:"Morale",    icon:"❤️" },
];

const PULSE_COLORS = {
  green:  { bg:"#27ae60", light:"#eafaf1", border:"#a9dfbf", text:"#1e8449", hex:"#27ae60" },
  yellow: { bg:"#f39c12", light:"#fef9e7", border:"#f9e79f", text:"#9a6e00", hex:"#f39c12" },
  red:    { bg:"#e74c3c", light:"#fdedec", border:"#f5b7b1", text:"#922b21", hex:"#e74c3c" },
};

// Rich site definitions — realistic named locations for a large multi-site client
const PULSE_SITES = [
  { id:"hq",    name:"Corporate HQ",          region:"Central",    size:"large",  employees:1200 },
  { id:"mfg1",  name:"Manufacturing — Plant A",region:"Southeast",  size:"large",  employees:860  },
  { id:"mfg2",  name:"Manufacturing — Plant B",region:"Midwest",    size:"large",  employees:740  },
  { id:"dist1", name:"Distribution Center East",region:"Northeast", size:"medium", employees:430  },
  { id:"dist2", name:"Distribution Center West",region:"Southwest", size:"medium", employees:390  },
  { id:"retail1",name:"Retail Hub — Atlanta",  region:"Southeast",  size:"medium", employees:280  },
  { id:"retail2",name:"Retail Hub — Chicago",  region:"Midwest",    size:"medium", employees:265  },
  { id:"ops1",  name:"Operations — Tampa",     region:"Southeast",  size:"small",  employees:190  },
  { id:"ops2",  name:"Operations — Denver",    region:"Southwest",  size:"small",  employees:175  },
  { id:"ops3",  name:"Operations — Nashville", region:"Central",    size:"small",  employees:160  },
  { id:"admin", name:"Admin & Shared Services",region:"Central",    size:"small",  employees:220  },
  { id:"field", name:"Field Teams (Composite)",region:"National",   size:"medium", employees:510  },
];

const PULSE_NOTES = {
  green: [
    "Strong engagement across all shifts. Employees are proactively approaching chaplains and morale remains consistently positive.",
    "Team cohesion is high following recent management listening sessions. Chaplain presence is well-received and trusted.",
    "All indicators positive. Several employees have expressed gratitude for chaplain availability during a challenging personal season.",
    "Excellent morale. Leadership visibility has improved noticeably and employees feel heard. Chaplains report meaningful connections.",
  ],
  yellow: [
    "Compensation questions have increased — employees comparing pay scales. Chaplains are facilitating HR referrals and providing a listening ear.",
    "Some fatigue visible among long-tenured staff. Policy changes have created uncertainty; chaplains monitoring and providing support.",
    "Management communication could be stronger in this area. Employees express feeling 'out of the loop.' Chaplains are bridging gaps.",
    "Immigration-related anxiety is elevated among a portion of the workforce. Community stressors are spilling into the workplace.",
    "Benefits confusion common among newer hires. Chaplains bridging gap with HR and ensuring employees know available resources.",
    "Turnover in a key department has stressed remaining team members. Chaplains providing extra care during this transition period.",
  ],
  red: [
    "Significant morale concerns this period. Feelings of being undervalued are widespread. Chaplains have flagged this for EDO attention and are providing elevated care.",
    "Safety incident last month continues to affect team confidence. Chaplains actively supporting affected employees and monitoring for ongoing distress.",
    "Multiple employees have expressed frustration with leadership responsiveness. Escalated to EDO. Chaplains maintaining trust and availability.",
    "Compensation grievances have reached a critical point. Several employees considering departure. Chaplains providing stability and referrals.",
  ],
};

const PULSE_MONTHS = ["Jan–Feb 2025","Mar–Apr 2025","May–Jun 2025","Jul–Aug 2025"];

function buildPulseMock(client) {
  const seed = (s) => { let h=0; for(let c of s) h=(h*31+c.charCodeAt(0))&0xffffffff; return Math.abs(h); };
  const pick = (arr, s) => arr[Math.abs(s) % arr.length];

  // Use client health to tilt distribution — realistic: most sites mostly green
  const pools = {
    green:  ["green","green","green","green","green","green","green","green","yellow","yellow","red"],
    yellow: ["green","green","green","green","green","yellow","yellow","yellow","yellow","red","red"],
    red:    ["green","green","green","yellow","yellow","yellow","red","red","red","red","red"],
  };
  const basePool = pools[client.health] || pools.green;

  return PULSE_MONTHS.map((month, mi) => {
    const sites = PULSE_SITES.map((site) => {
      const base = seed(client.id + month + site.id);
      const cats = {};
      PULSE_CATEGORIES.forEach((cat) => {
        const s = seed(client.id + month + site.id + cat.key);
        // Morale cell slightly more volatile but still tilted green
        const pool = cat.key === "morale"
          ? (client.health==="green" ? ["green","green","green","green","green","yellow","yellow","red"] : basePool)
          : basePool;
        cats[cat.key] = pick(pool, s);
      });
      const worstStatus = Object.values(cats).includes("red") ? "red"
        : Object.values(cats).includes("yellow") ? "yellow" : "green";
      // Weighted score: green=3, yellow=2, red=1
      const scoreVal = Object.values(cats).reduce((sum,st)=>sum+(st==="green"?3:st==="yellow"?2:1),0);
      const maxVal = PULSE_CATEGORIES.length * 3;
      const scorePct2 = scoreVal / maxVal;
      // Statistical overall: >80% weighted score = green, 60–80% = yellow, <60% = red
      // This means 6/7 green + 1 yellow still reads green (~86% score)
      const overallStatus = scorePct2 > 0.80 ? "green" : scorePct2 > 0.60 ? "yellow" : "red";
      const notePool = PULSE_NOTES[worstStatus];
      return {
        ...site,
        statuses: cats,
        overallStatus,
        worstStatus,
        note: (base % 3 !== 2) ? pick(notePool, base) : null,
        hasIssue: overallStatus === "red",
        score: scoreVal,
      };
    });
    // Portfolio-level health score (0–100)
    const totalScore = sites.reduce((s,site)=>s+site.score, 0);
    const maxScore = sites.length * PULSE_CATEGORIES.length * 3;
    return {
      month,
      sites,
      healthScore: Math.round(totalScore / maxScore * 100),
    };
  });
}

const PULSE_CATEGORY_DETAIL = {
  workplace: {
    green: {
      summary: "Policies are well understood and consistently applied across shifts.",
      stories: [
        "A long-tenured employee told our chaplain she finally feels like 'the rules are fair for everyone' after the recent handbook update. She said it made her want to stay.",
        "Multiple employees mentioned that the new flexible scheduling policy has reduced personal stress significantly. One employee said it saved her marriage.",
        "A supervisor proactively asked our chaplain to help communicate a policy change to his team before it rolled out — a sign of real trust in the chaplain relationship.",
      ],
      insight: "When employees feel policies are fair, chaplains hear fewer grievances and more meaningful conversations about personal growth and goals.",
    },
    yellow: {
      summary: "Some uncertainty around recent policy changes. Chaplains are fielding questions and providing referrals to HR.",
      stories: [
        "One employee came to our chaplain confused about the new attendance policy. After clarification, he said he felt relieved — he thought he was about to lose his job.",
        "A team lead shared that her crew feels 'in the dark' about upcoming restructuring. Chaplain helped her prepare how to talk to her team about change and uncertainty.",
      ],
      insight: "Policy transitions create anxiety even when the change is positive. Chaplain presence during rollouts significantly reduces rumor and fear.",
    },
    red: {
      summary: "Significant concerns about fairness and consistency in policy enforcement. Chaplains have flagged for EDO follow-up.",
      stories: [
        "Multiple employees have expressed that rules are applied differently depending on who your supervisor is. Chaplains are listening carefully and documenting themes without identifying individuals.",
        "A newer employee confided feeling targeted after a disciplinary action. Chaplain connected her with HR and provided ongoing emotional support through the process.",
      ],
      insight: "Inconsistent policy application is one of the leading drivers of morale decline. Early chaplain engagement here can prevent escalation to formal complaints.",
    },
  },
  benefits: {
    green: {
      summary: "Employees are aware of and utilizing their benefits effectively.",
      stories: [
        "A chaplain helped a grieving employee navigate the bereavement leave process after losing his father — he told us he wouldn't have known what he was entitled to without that conversation.",
        "Three new hires in one week asked our chaplain about the EAP. All three followed through on referrals. One said it was 'the most helpful thing anyone at this company has done for me.'",
        "An employee came in stressed about a medical bill. Chaplain walked her through her benefits coverage — she had more help available than she realized and left visibly relieved.",
      ],
      insight: "Benefits awareness is often higher at sites with strong chaplain presence. Chaplains serve as trusted, non-HR navigators who help employees find help without fear of judgment.",
    },
    yellow: {
      summary: "Some confusion around benefits eligibility, especially among newer employees and those with language barriers.",
      stories: [
        "A Spanish-speaking employee didn't realize his family members were eligible for coverage. Chaplain arranged a benefits walk-through with an interpreter.",
        "During open enrollment, several employees came to our chaplain overwhelmed by the choices. Chaplain sat with them and helped them understand their options — not to advise, but to decode the language.",
      ],
      insight: "Benefits confusion is highest in the first 90 days of employment and during open enrollment windows. Proactive chaplain check-ins during these windows reduce anxiety and missed opportunities.",
    },
    red: {
      summary: "Employees are frustrated with benefits access and feel the company is not delivering on promises made during hiring.",
      stories: [
        "A employee shared that her insurance claim was denied three times. Chaplain provided emotional support and connected her to an employee advocacy resource.",
        "Several employees report that promised benefits were not available to them at hire as described. Chaplain has documented themes and surfaced them to the EDO.",
      ],
      insight: "When employees feel misled about benefits, it erodes trust broadly — not just in HR, but in leadership. Chaplain presence helps absorb the emotional impact while systemic issues are addressed.",
    },
  },
  management: {
    green: {
      summary: "Employees feel seen, respected, and communicated with clearly by their supervisors.",
      stories: [
        "A plant manager asked our chaplain to open a leadership meeting with a reflection on resilience during a difficult production quarter. The team said it changed the tone of the whole meeting.",
        "Several employees on the floor mentioned that their manager recently started doing brief one-on-one check-ins. More than one credited our chaplain's encouragement to that manager for the change.",
        "An employee told our chaplain: 'My supervisor actually listened to me last week for the first time. I don't know what happened, but it felt different.' That supervisor had recently attended a chaplain-facilitated listening session.",
      ],
      insight: "Management tone is the single biggest driver of site morale. When chaplains build relationships with supervisors, the positive effects cascade to their entire teams.",
    },
    yellow: {
      summary: "Some communication gaps between management and frontline staff. Chaplains working to bridge the gap.",
      stories: [
        "Employees on second shift report feeling forgotten — they don't get the same face time with leadership that day shift does. Chaplain has begun specifically scheduling second-shift presence.",
        "A supervisor came to our chaplain frustrated that her team wasn't responding to her. After a conversation, she realized she had been communicating directives without acknowledging effort. Things have since improved.",
      ],
      insight: "Management issues rarely start as 'bad management' — they often start as communication style mismatches. Chaplains are uniquely positioned to speak truth to both sides without political risk.",
    },
    red: {
      summary: "Employees feel unheard, undervalued, or mistreated by supervisors. Morale is significantly impacted.",
      stories: [
        "An employee broke down crying while talking to our chaplain, saying she dreads coming to work because of how her manager speaks to her in front of the team. Chaplain provided care and connected her with HR.",
        "Multiple employees across different shifts describe the same supervisor using demeaning language. Chaplain has surfaced this pattern to the EDO without identifying individuals.",
      ],
      insight: "When employees carry workplace pain home, it affects families, health, and retention. Chaplain presence at sites with difficult management dynamics is often the only non-threatening outlet employees have.",
    },
  },
  compensation: {
    green: {
      summary: "Employees feel fairly compensated and trust that pay decisions are transparent.",
      stories: [
        "An employee told our chaplain she just got her first raise in two years and felt genuinely appreciated. She said it made her want to recruit her sister to work here.",
        "A newer employee asked our chaplain how pay reviews work. Chaplain connected him with his supervisor — the conversation led to a clear development plan and a timeline for his first review.",
      ],
      insight: "Pay satisfaction is less about the number and more about perceived fairness and transparency. Sites that communicate compensation rationale clearly see significantly higher morale scores.",
    },
    yellow: {
      summary: "Employees raising questions about pay equity and comparisons with new hires. Chaplains listening and referring where appropriate.",
      stories: [
        "A veteran employee learned that a new hire in her role makes more than she does. She came to our chaplain devastated. Chaplain provided care and helped her prepare for a conversation with HR.",
        "Several employees mention reduced hours have meaningfully cut their take-home pay. Chaplains are spending more time helping employees think through budgeting and connect with community assistance resources.",
      ],
      insight: "Compensation anxiety is often a proxy for feeling undervalued overall. Chaplains who address the emotional dimension first often find employees more equipped to take practical next steps.",
    },
    red: {
      summary: "Widespread frustration over pay that hasn't kept pace with cost of living. Retention risk is elevated.",
      stories: [
        "Three experienced employees on one shift told our chaplain they are actively job searching. Compensation was the primary reason given. Chaplain has shared this retention signal with the EDO.",
        "An employee supporting three children said she can no longer make rent on her current wages after losing overtime hours. Chaplain connected her with emergency assistance resources and is providing ongoing support.",
      ],
      insight: "When compensation concerns reach critical levels, chaplains become essential stabilizers — not just emotionally, but practically, by connecting employees with resources that reduce the immediate financial pressure.",
    },
  },
  safety: {
    green: {
      summary: "Employees feel physically safe and trust that safety concerns are taken seriously.",
      stories: [
        "An employee proactively told our chaplain about a near-miss she witnessed. Chaplain helped her feel safe reporting it through proper channels — she said she wouldn't have done it alone.",
        "After a safety training, several employees stopped our chaplain to say they finally felt like the company 'actually cares if we go home in one piece.' That sentiment is worth noting.",
      ],
      insight: "Psychological safety and physical safety are deeply connected. When employees trust their chaplain, they're more likely to report concerns they'd otherwise bury.",
    },
    yellow: {
      summary: "Some employees raising safety concerns that feel underaddressed. Chaplains monitoring and encouraging proper reporting.",
      stories: [
        "An employee confided he had reported a safety issue twice and felt ignored. Chaplain encouraged him to escalate and offered to help him navigate the process.",
        "Night shift employees report that lighting in a key area is inadequate and has led to multiple stumbles. Chaplain has noted this as a recurring theme to surface to site leadership.",
      ],
      insight: "Unreported safety concerns are often a trust issue, not just a process one. Chaplains help employees feel safe enough to speak up — which ultimately protects everyone.",
    },
    red: {
      summary: "Active safety concerns identified. Chaplains providing care to affected employees and supporting post-incident response.",
      stories: [
        "Following a serious equipment incident, our chaplain was on-site within the hour. The chaplain provided immediate emotional support to the affected employee's crew and stayed through the end of their shift.",
        "An employee is struggling with anxiety returning to the area where an incident occurred. Chaplain has been meeting with her weekly and coordinating with EAP for professional support.",
      ],
      insight: "Chaplains play a critical role in post-incident care — helping teams process fear and grief while remaining productive. Their presence can meaningfully reduce long-term trauma responses.",
    },
  },
  community: {
    green: {
      summary: "Employees feel connected — to each other, to the company, and to the broader community around them.",
      stories: [
        "Our chaplain helped organize an informal moment of recognition for an employee whose daughter received a college scholarship. The whole floor showed up. She said it was the best day she'd had at work in ten years.",
        "A group of employees asked our chaplain to help them coordinate a food drive for a coworker's family after a house fire. Chaplain facilitated logistics and the response was overwhelming.",
        "An employee recently immigrated to the US and told our chaplain he finally feels like he 'belongs somewhere' at this site. Community connection has been a lifeline for him during a disorienting season.",
      ],
      insight: "When community is strong, employees look out for each other — and for the company. Sites with high community scores tend to have lower absenteeism and faster incident recovery.",
    },
    yellow: {
      summary: "Some disconnection visible, especially across shifts or between tenured and newer employees.",
      stories: [
        "Day and night shift employees barely know each other's names. Chaplain has begun facilitating brief cross-shift moments — even small gestures of acknowledgment are improving the culture.",
        "Immigration anxiety in the broader community is spilling into the workplace. Several employees are fearful about family members' status. Chaplain is providing compassionate presence and connecting families with legal aid resources.",
      ],
      insight: "Community fractures often follow demographic or shift lines. Chaplains who intentionally bridge these divides help build a site culture that transcends individual anxiety.",
    },
    red: {
      summary: "Significant community stress — both inside and outside the workplace — is affecting morale and cohesion.",
      stories: [
        "Several employees are dealing with immigration-related fear for themselves or family members. Our chaplain has held informal listening conversations and connected families with legal resources and counseling.",
        "A wave of grief swept through this site after a community tragedy affected multiple employee families simultaneously. Chaplain coordinated a response team and provided on-site support for two weeks.",
      ],
      insight: "Community crises don't stop at the plant gate. Chaplains who stay close to employees' lives outside work are often the first to know when a community event is about to affect workplace morale.",
    },
  },
  morale: {
    green: {
      summary: "Overall spirit at this site is strong. Employees are engaged, hopeful, and feel cared for.",
      stories: [
        "An employee who had been struggling for months told our chaplain, 'I actually look forward to coming to work now.' That shift happened over about six weeks of intentional chaplain presence.",
        "A supervisor told our chaplain, 'I don't know what you all do exactly, but this team is different than it was a year ago.' That's the chaplain effect — quiet, relational, and cumulative.",
        "During a particularly demanding production push, employees kept morale up by checking on each other. Our chaplain said it felt like watching a community take care of itself.",
      ],
      insight: "High morale is not an accident — it's the result of consistent care, communication, and connection. Chaplain presence is one of the most cost-effective morale investments a company can make.",
    },
    yellow: {
      summary: "Morale is mixed. Pockets of strong culture exist alongside fatigue and uncertainty.",
      stories: [
        "A team that recently lost a beloved manager is struggling with the transition. Chaplain has been a steady presence through the change and is helping the team build trust with new leadership.",
        "Employees are tired. Extended shifts over several months have worn people down. Chaplain is intentionally affirming effort and helping employees find small ways to recover.",
      ],
      insight: "Moderate morale often masks significant resilience. Chaplains help employees find meaning in their work even during difficult seasons — and that meaning is what keeps people from leaving.",
    },
    red: {
      summary: "Morale is significantly depressed. Chaplains are providing elevated care and the situation has been escalated to the EDO.",
      stories: [
        "An employee told our chaplain she feels 'invisible.' She has worked here for nine years and says no one in leadership knows her name. Chaplain is advocating for recognition practices to be strengthened.",
        "Absenteeism is rising and employees are vocal about not feeling valued. Chaplain has documented key themes — compensation, communication, and workload — and presented them to site leadership with care and without accusation.",
      ],
      insight: "Low morale is expensive — in turnover, absenteeism, and quality. Chaplains serve as early warning systems and stabilizers, but systemic issues require leadership response to fully resolve.",
    },
  },
};

const ECR_DEFAULT_BLOCKS = [
  { id:1, type:"cover_slide",  text:"", edits:{} },
  { id:2, type:"kpi_row",      text:"", edits:{} },
  { id:3, type:"interactions", text:"", edits:{} },
  { id:4, type:"sentiment",    text:"", edits:{} },
  { id:5, type:"text_block",   text:"Chaplain observations for this period: Our team continues to build trust across all departments. The increase in follow-up requests reflects deepening employee engagement.", edits:{} },
  { id:6, type:"crisis",       text:"", edits:{} },
];

// ── ECR Drill Modal ───────────────────────────────────────────────────────────
function ECRDrillModal({ drill, client, onClose }) {
  if (!drill) return null;
  const cc = client.color;
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(10,20,40,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(3px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:680,maxHeight:"85vh",overflow:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.22)" }}>
        <div style={{ padding:"20px 24px 16px",borderBottom:"1px solid #e8edf2",display:"flex",alignItems:"flex-start",justifyContent:"space-between",position:"sticky",top:0,background:"#fff",zIndex:10 }}>
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:cc,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4 }}>{drill.subtitle}</div>
            <div style={{ fontSize:20,fontWeight:700,color:"#1a2a3a",fontFamily:"'Georgia',serif" }}>{drill.title}</div>
          </div>
          <button onClick={onClose} style={{ border:"none",background:"#f0f4f8",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#6b7a8d",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:"20px 24px 28px" }}>
          {drill.chartType==="grouped_bar" && (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={drill.data} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                <XAxis dataKey="week" tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius:8,border:"1px solid #e0e6ef",fontSize:13 }} />
                <Legend wrapperStyle={{ fontSize:12 }} />
                <Bar dataKey="visits" name="Visits" fill={cc} radius={[4,4,0,0]} />
                <Bar dataKey="followups" name="Follow-ups" fill={cc+"88"} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {drill.chartType==="hbar" && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={drill.data} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" horizontal={false} />
                <XAxis type="number" tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} unit="%" />
                <YAxis dataKey="dept" type="category" width={90} tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius:8 }} />
                <Bar dataKey="pct" name="% of dept" fill={drill.barColor||cc} radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {drill.chartType==="area" && (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={drill.data}>
                <defs>
                  <linearGradient id="ecrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cc} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={cc} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                <XAxis dataKey="month" tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} unit={drill.unit||""} />
                <Tooltip contentStyle={{ borderRadius:8,border:"1px solid #e0e6ef",fontSize:13 }} />
                <Area type="monotone" dataKey="v" name={drill.seriesLabel||"Value"} stroke={cc} strokeWidth={2.5} fill="url(#ecrGrad)" dot={{ fill:cc,r:4 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {drill.stats && (
            <div style={{ display:"flex",gap:12,marginTop:20 }}>
              {drill.stats.map((s,i)=>(
                <div key={i} style={{ flex:1,background:"#f7f9fc",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${cc}` }}>
                  <div style={{ fontSize:22,fontWeight:700,color:cc,fontFamily:"'Georgia',serif" }}>{s.value}</div>
                  <div style={{ fontSize:12,color:"#6b7a8d",marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          {drill.note && (
            <div style={{ marginTop:20,padding:"14px 16px",background:`${cc}0d`,borderLeft:`3px solid ${cc}`,borderRadius:"0 8px 8px 0" }}>
              <div style={{ fontSize:11,fontWeight:700,color:cc,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5 }}>Chaplain Insight</div>
              <div style={{ fontSize:13,color:"#2c3e50",lineHeight:1.7 }}>{drill.note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildECRDrill(blockType, clickKey, client) {
  if (blockType==="interactions_month") {
    const d=ECR_MOCK.interactionDrilldown[clickKey]||[];
    return { title:`${clickKey} — Week-by-Week Breakdown`, subtitle:"Interaction Trends · Drill-Down", chartType:"grouped_bar", data:d,
      stats:[{label:"Total Visits",value:d.reduce((a,b)=>a+b.visits,0)},{label:"Total Follow-ups",value:d.reduce((a,b)=>a+b.followups,0)},{label:"Follow-up Rate",value:`${Math.round(d.reduce((a,b)=>a+b.followups,0)/d.reduce((a,b)=>a+b.visits,0)*100)}%`}] };
  }
  if (blockType==="sentiment_slice") {
    const d=ECR_MOCK.sentimentDrilldown[clickKey]||[];
    const info=ECR_MOCK.sentiment.find(s=>s.category===clickKey);
    return { title:`"${clickKey}" — By Department`, subtitle:"Employee Sentiment · Drill-Down", chartType:"hbar", data:d, barColor:info?.color,
      note:`${clickKey} sentiment distributed across departments. Departments with higher rates may reflect deeper chaplain relationships or recent positive engagement.` };
  }
  if (blockType==="demo_dept") {
    const d=ECR_MOCK.demographicDrilldown[clickKey]||[];
    return { title:`${clickKey} — Activity Over Time`, subtitle:"Department Breakdown · Drill-Down", chartType:"area", data:d, seriesLabel:"Visits",
      stats:[{label:"6-Month Total",value:d.reduce((a,b)=>a+b.v,0)},{label:"Monthly Avg",value:Math.round(d.reduce((a,b)=>a+b.v,0)/d.length)},{label:"Peak Month",value:d.reduce((a,b)=>b.v>a.v?b:a,d[0])?.month||"—"}] };
  }
  if (blockType==="crisis_type") {
    const d=ECR_MOCK.crisisDrilldown[clickKey];
    const total=ECR_MOCK.crisis.find(c=>c.type===clickKey)?.count||0;
    return { title:`${clickKey} — Case Detail`, subtitle:"Crisis & Referrals · Drill-Down", chartType:"area", data:d?.trend||[], seriesLabel:"Cases",
      note:d?.note||"", stats:[{label:"Total Cases",value:total},{label:"Avg / Month",value:(total/6).toFixed(1)},{label:"Referral Rate",value:"100%"}] };
  }
  if (blockType==="kpi_card") {
    const d=ECR_MOCK.kpiDrilldown[clickKey];
    const kpi=ECR_MOCK.kpis.find(k=>k.key===clickKey);
    return { title:`${kpi?.label} — 6-Month Trend`, subtitle:"KPI Summary · Drill-Down", chartType:"area", data:d?.trend||[], seriesLabel:kpi?.label,
      unit:clickKey==="response"?" hrs":"", note:d?.note||"",
      stats:[{label:"Current Period",value:kpi?.value},{label:"Change",value:kpi?.delta}] };
  }
  return null;
}

const ECR_ST  = { fontSize:17,fontWeight:700,color:"#1a2a3a",marginBottom:6,marginTop:0,fontFamily:"'Georgia',serif" };
const ECR_Sub = { fontSize:13,color:"#6b7a8d",margin:"0 0 8px" };
const DrillHint = () => (
  <div style={{ fontSize:11,color:"#9aa8b8",marginBottom:8,display:"flex",alignItems:"center",gap:5 }}>
    <span>🖱</span><span>Click to drill in</span>
  </div>
);

// ── Pulse Report Block ────────────────────────────────────────────────────────
// ── Site Detail Popup ─────────────────────────────────────────────────────────
function SiteDetailPopup({ site, period, allPeriods, cc, onClose }) {
  if (!site) return null;
  const [activeTab, setActiveTab] = useState("overview");   // "overview" | cat.key
  const PC = PULSE_COLORS[site.overallStatus];
  const statusDot = { green:"🟢", yellow:"🟡", red:"🔴" };

  const siteTrend = allPeriods.map(p => {
    const s = p.sites.find(x => x.id === site.id);
    return { month: p.month.replace("–"," – "), score: s ? s.score : 0 };
  });
  const maxScore = PULSE_CATEGORIES.length * 3;
  const scorePct = Math.round(site.score / maxScore * 100);

  const activeCat = PULSE_CATEGORIES.find(c => c.key === activeTab);
  const catStatus = activeCat ? site.statuses[activeCat.key] : null;
  const catDetail = activeCat ? PULSE_CATEGORY_DETAIL[activeCat.key]?.[catStatus] : null;
  const catPC = catStatus ? PULSE_COLORS[catStatus] : null;

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(10,20,40,0.65)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:20,width:"100%",maxWidth:680,maxHeight:"92vh",overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.32)",display:"flex",flexDirection:"column" }}>

        {/* ── Header ── */}
        <div style={{ background:`linear-gradient(135deg,${PC.text} 0%,${PC.hex}bb 100%)`,padding:"18px 22px",color:"#fff",flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12 }}>
            <div>
              <div style={{ fontSize:10,opacity:0.75,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:3 }}>{site.region} Region · {site.size} site</div>
              <div style={{ fontSize:21,fontWeight:700,fontFamily:"'Georgia',serif" }}>{site.name}</div>
              <div style={{ fontSize:12,opacity:0.8,marginTop:2 }}>{site.employees.toLocaleString()} employees · {period.month}</div>
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.18)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:15,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>✕</button>
          </div>
          {/* Score bar */}
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ flex:1,height:7,background:"rgba(255,255,255,0.22)",borderRadius:4,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${scorePct}%`,background:"rgba(255,255,255,0.88)",borderRadius:4 }} />
            </div>
            <div style={{ fontSize:13,fontWeight:700,opacity:0.95,flexShrink:0 }}>
              {site.overallStatus==="green"?"🟢 Strong":site.overallStatus==="yellow"?"🟡 Moderate":"🔴 Needs Care"} · {scorePct}%
            </div>
          </div>
        </div>

        {/* ── Category nav tabs ── */}
        <div style={{ display:"flex",gap:4,padding:"10px 14px 0",background:"#f7f9fc",borderBottom:"1px solid #e8edf2",overflowX:"auto",flexShrink:0 }}>
          <button onClick={()=>setActiveTab("overview")}
            style={{ padding:"6px 14px",borderRadius:"8px 8px 0 0",border:"none",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",
              background:activeTab==="overview"?"#fff":"transparent",
              color:activeTab==="overview"?"#1a2a3a":"#6b7a8d",
              borderBottom:activeTab==="overview"?"2px solid #fff":"2px solid transparent",
              boxShadow:activeTab==="overview"?"0 -2px 8px rgba(0,0,0,0.06)":undefined }}>
            📋 Overview
          </button>
          {PULSE_CATEGORIES.map(cat => {
            const st = site.statuses[cat.key];
            const c = PULSE_COLORS[st];
            const isActive = activeTab === cat.key;
            return (
              <button key={cat.key} onClick={()=>setActiveTab(cat.key)}
                style={{ padding:"6px 12px",borderRadius:"8px 8px 0 0",border:"none",fontSize:11,fontWeight:isActive?700:500,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4,
                  background:isActive?"#fff":c.light,
                  color:isActive?c.text:"#6b7a8d",
                  borderBottom:isActive?`2px solid ${c.hex}`:"2px solid transparent",
                  boxShadow:isActive?"0 -2px 8px rgba(0,0,0,0.06)":undefined }}>
                <span>{cat.icon}</span>
                <span>{cat.short}</span>
                <span style={{ fontSize:12 }}>{statusDot[st]}</span>
              </button>
            );
          })}
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY:"auto",flex:1,padding:"20px 22px 28px" }}>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div>
              {/* 7 category cards — clickable */}
              <div style={{ fontSize:11,color:"#9aa8b8",marginBottom:10,fontStyle:"italic" }}>
                Click any category below to see chaplain stories and insights
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:18 }}>
                {PULSE_CATEGORIES.map(cat => {
                  const st = site.statuses[cat.key];
                  const c = PULSE_COLORS[st];
                  return (
                    <div key={cat.key} onClick={()=>setActiveTab(cat.key)}
                      style={{ background:c.light,border:`2px solid ${c.border}`,borderRadius:10,padding:"10px 4px",textAlign:"center",cursor:"pointer",transition:"transform 0.12s,box-shadow 0.12s" }}
                      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 4px 12px ${c.hex}44`;}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                      <div style={{ fontSize:18,marginBottom:3 }}>{cat.icon}</div>
                      <div style={{ fontSize:8,fontWeight:700,color:c.text,textTransform:"uppercase",letterSpacing:"0.04em",lineHeight:1.2 }}>{cat.short}</div>
                      <div style={{ fontSize:15,marginTop:3 }}>{statusDot[st]}</div>
                    </div>
                  );
                })}
              </div>

              {/* Trend chart */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#1a2a3a",marginBottom:8 }}>Health Score Trend</div>
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={siteTrend} margin={{ top:4,right:4,bottom:0,left:0 }}>
                    <defs>
                      <linearGradient id={`sg_${site.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PC.hex} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={PC.hex} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize:10,fill:"#9aa8b8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0,maxScore]} hide />
                    <Tooltip formatter={v=>[`${Math.round(v/maxScore*100)}%`,"Health"]} contentStyle={{ fontSize:11,borderRadius:8 }} />
                    <Area type="monotone" dataKey="score" stroke={PC.hex} strokeWidth={2.5} fill={`url(#sg_${site.id})`} dot={{ fill:PC.hex,r:4,strokeWidth:0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* General chaplain note */}
              {site.note && (
                <div style={{ background:PC.light,border:`1px solid ${PC.border}`,borderRadius:10,padding:"14px 16px",marginBottom:14 }}>
                  <div style={{ fontSize:10,fontWeight:700,color:PC.text,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:6 }}>Chaplain Field Notes — {period.month}</div>
                  <div style={{ fontSize:13,color:"#2c3e50",lineHeight:1.75,fontStyle:"italic" }}>"{site.note}"</div>
                </div>
              )}

              {/* Alert banners */}
              {site.hasIssue && (
                <div style={{ background:"#fdedec",border:"1px solid #f5b7b1",borderRadius:10,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start" }}>
                  <div style={{ fontSize:18,flexShrink:0 }}>⚠️</div>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:"#922b21",marginBottom:2 }}>Attention Required</div>
                    <div style={{ fontSize:12,color:"#922b21",lineHeight:1.5 }}>Elevated concerns identified this period. EDO follow-up is recommended. Click individual categories above for specifics.</div>
                  </div>
                </div>
              )}
              {!site.hasIssue && site.overallStatus==="yellow" && (
                <div style={{ background:"#fef9e7",border:"1px solid #f9e79f",borderRadius:10,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start" }}>
                  <div style={{ fontSize:18,flexShrink:0 }}>👁</div>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:"#9a6e00",marginBottom:2 }}>Monitor Closely</div>
                    <div style={{ fontSize:12,color:"#9a6e00",lineHeight:1.5 }}>Mild concerns present. Chaplains are engaged. Click individual categories for more context.</div>
                  </div>
                </div>
              )}
              {site.overallStatus==="green" && (
                <div style={{ background:"#eafaf1",border:"1px solid #a9dfbf",borderRadius:10,padding:"12px 14px",display:"flex",gap:10,alignItems:"flex-start" }}>
                  <div style={{ fontSize:18,flexShrink:0 }}>✨</div>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:"#1e8449",marginBottom:2 }}>This is a great story to tell</div>
                    <div style={{ fontSize:12,color:"#1e8449",lineHeight:1.5 }}>This site is performing well across the board. Click individual categories to find specific moments worth sharing with your client.</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY DETAIL TAB */}
          {activeTab !== "overview" && activeCat && catDetail && (
            <div>
              {/* Category header */}
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:"14px 16px",background:catPC.light,border:`1.5px solid ${catPC.border}`,borderRadius:12 }}>
                <div style={{ fontSize:32 }}>{activeCat.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15,fontWeight:700,color:catPC.text,fontFamily:"'Georgia',serif" }}>{activeCat.label}</div>
                  <div style={{ fontSize:12,color:catPC.text,opacity:0.85,marginTop:3,lineHeight:1.5 }}>{catDetail.summary}</div>
                </div>
                <div style={{ fontSize:28,flexShrink:0 }}>{statusDot[catStatus]}</div>
              </div>

              {/* Stories */}
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#1a2a3a",marginBottom:10,display:"flex",alignItems:"center",gap:6 }}>
                  <span>💬</span> Chaplain Stories from This Site
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {catDetail.stories.map((story, i) => (
                    <div key={i} style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${catPC.hex}` }}>
                      <div style={{ display:"flex",gap:8,alignItems:"flex-start" }}>
                        <div style={{ fontSize:18,flexShrink:0,marginTop:-1 }}>{["🕊️","🌱","💛"][i % 3]}</div>
                        <div style={{ fontSize:13,color:"#2c3e50",lineHeight:1.75,fontStyle:"italic" }}>"{story}"</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chaplain insight */}
              <div style={{ background:`${catPC.hex}12`,border:`1px solid ${catPC.hex}44`,borderRadius:10,padding:"14px 16px" }}>
                <div style={{ fontSize:10,fontWeight:700,color:catPC.text,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:6,display:"flex",alignItems:"center",gap:5 }}>
                  <span>💡</span> Chaplain Insight
                </div>
                <div style={{ fontSize:13,color:"#2c3e50",lineHeight:1.75 }}>{catDetail.insight}</div>
              </div>

              {/* Back prompt */}
              <div style={{ marginTop:16,textAlign:"center" }}>
                <button onClick={()=>setActiveTab("overview")} style={{ background:"none",border:"1px solid #e0e6ef",borderRadius:8,padding:"7px 18px",fontSize:12,color:"#6b7a8d",cursor:"pointer" }}>
                  ← Back to Overview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pulse Report Block (Executive View) ───────────────────────────────────────
function PulseReportBlock({ client, cc }) {
  const pulseData = buildPulseMock(client);
  const [selectedMonth, setSelectedMonth] = useState(pulseData.length - 1);
  const [viewMode, setViewMode] = useState("cards");   // "cards" | "heatmap" | "trend"
  const [popupSite, setPopupSite] = useState(null);
  const [regionFilter, setRegionFilter] = useState("All");
  const period = pulseData[selectedMonth];

  const regions = ["All", ...Array.from(new Set(PULSE_SITES.map(s=>s.region))).sort()];

  const filteredSites = period.sites.filter(s =>
    regionFilter === "All" || s.region === regionFilter
  );

  // Portfolio-level counts
  const allStatuses = filteredSites.flatMap(s => Object.values(s.statuses));
  const counts = { green:0, yellow:0, red:0 };
  allStatuses.forEach(st => counts[st]++);
  const total = allStatuses.length || 1;

  // Trend across periods
  const trendData = pulseData.map(p => {
    const sites = regionFilter==="All" ? p.sites : p.sites.filter(s=>s.region===regionFilter);
    const all = sites.flatMap(s => Object.values(s.statuses));
    const n = all.length || 1;
    const g = all.filter(x=>x==="green").length;
    const y = all.filter(x=>x==="yellow").length;
    const r = all.filter(x=>x==="red").length;
    return { month:p.month, score:p.healthScore, greenPct:Math.round(g/n*100), yellowPct:Math.round(y/n*100), redPct:Math.round(r/n*100) };
  });

  // Category-level aggregates for heatmap
  const catAgg = PULSE_CATEGORIES.map(cat => {
    const vals = filteredSites.map(s => s.statuses[cat.key]);
    const g = vals.filter(x=>x==="green").length;
    const y = vals.filter(x=>x==="yellow").length;
    const r = vals.filter(x=>x==="red").length;
    const worstCat = r>0?"red":y>0?"yellow":"green";
    return { ...cat, green:g, yellow:y, red:r, worst:worstCat };
  });

  const flaggedCount = filteredSites.filter(s=>s.hasIssue).length;
  const healthScore = Math.round(filteredSites.reduce((a,s)=>a+s.score,0) / (filteredSites.length * PULSE_CATEGORIES.length * 3) * 100);
  const prevScore = pulseData[Math.max(0,selectedMonth-1)].healthScore;
  const scoreDelta = healthScore - prevScore;

  return (
    <div>
      {/* Popup */}
      {popupSite && (
        <SiteDetailPopup
          site={popupSite}
          period={period}
          allPeriods={pulseData}
          cc={cc}
          onClose={()=>setPopupSite(null)}
        />
      )}

      {/* Header row */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8 }}>
        <div>
          <h3 style={ECR_ST}>💓 Employee Pulse Report</h3>
          <p style={ECR_Sub}>Portfolio-wide morale &amp; workplace climate across all sites — {period.month}</p>
        </div>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
          {/* Region filter */}
          <select value={regionFilter} onChange={e=>setRegionFilter(e.target.value)}
            style={{ padding:"5px 10px",borderRadius:7,border:"1px solid #d0dae6",fontSize:11,color:"#1a2a3a",background:"#f7f9fc",cursor:"pointer" }}>
            {regions.map(r=><option key={r}>{r}</option>)}
          </select>
          {/* View tabs */}
          {[["cards","🏢 Sites"],["heatmap","🗂 Heat Map"],["trend","📈 Trend"]].map(([m,lbl])=>(
            <button key={m} onClick={()=>setViewMode(m)}
              style={{ padding:"5px 11px",borderRadius:7,border:"1px solid",borderColor:viewMode===m?cc:"#d0dae6",background:viewMode===m?cc:"#fff",color:viewMode===m?"#fff":"#6b7a8d",fontSize:11,fontWeight:viewMode===m?700:400,cursor:"pointer",whiteSpace:"nowrap" }}>
              {lbl}
            </button>
          ))}
          {/* Period selector */}
          <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}
            style={{ padding:"5px 10px",borderRadius:7,border:"1px solid #d0dae6",fontSize:11,color:"#1a2a3a",background:"#f7f9fc",cursor:"pointer" }}>
            {pulseData.map((p,i)=><option key={i} value={i}>{p.month}</option>)}
          </select>
        </div>
      </div>

      {/* Executive KPI strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:18 }}>
        {[
          { label:"Portfolio Health", value:`${healthScore}%`, sub: scoreDelta===0?"No change":`${scoreDelta>0?"+":""}${scoreDelta}pts vs prior`, col:healthScore>=70?"#27ae60":healthScore>=50?"#f39c12":"#e74c3c", bg:healthScore>=70?"#eafaf1":healthScore>=50?"#fef9e7":"#fdedec" },
          { label:"🟢 Positive",  value:`${Math.round(counts.green/total*100)}%`,  sub:`${counts.green} ratings`,  col:"#27ae60", bg:"#eafaf1" },
          { label:"🟡 Monitor",   value:`${Math.round(counts.yellow/total*100)}%`, sub:`${counts.yellow} ratings`, col:"#f39c12", bg:"#fef9e7" },
          { label:"🔴 Concern",   value:`${Math.round(counts.red/total*100)}%`,    sub:`${counts.red} ratings`,   col:"#e74c3c", bg:"#fdedec" },
          { label:"Sites Flagged",value:flaggedCount, sub:`of ${filteredSites.length} sites`, col:flaggedCount>0?"#e74c3c":"#27ae60", bg:flaggedCount>0?"#fdedec":"#eafaf1" },
        ].map((k,i)=>(
          <div key={i} style={{ background:k.bg,border:`1px solid ${k.col}22`,borderRadius:10,padding:"12px 14px",textAlign:"center" }}>
            <div style={{ fontSize:24,fontWeight:700,color:k.col,fontFamily:"'Georgia',serif",lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:10,color:k.col,fontWeight:700,marginTop:4,textTransform:"uppercase",letterSpacing:"0.06em" }}>{k.label}</div>
            <div style={{ fontSize:10,color:"#9aa8b8",marginTop:3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── CARDS VIEW ── */}
      {viewMode === "cards" && (
        <div>
          <div style={{ fontSize:11,color:"#9aa8b8",marginBottom:10,fontStyle:"italic" }}>Click any site card for full detail and chaplain notes</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10 }}>
            {filteredSites.map((site,si) => {
              const PC = PULSE_COLORS[site.overallStatus];
              const scorePct = Math.round(site.score / (PULSE_CATEGORIES.length*3) * 100);
              return (
                <div key={site.id} onClick={()=>setPopupSite(site)}
                  style={{ background:"#fff",border:`2px solid ${PC.border}`,borderRadius:12,padding:"14px",cursor:"pointer",transition:"transform 0.15s,box-shadow 0.15s",position:"relative",overflow:"hidden" }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 8px 24px ${PC.hex}33`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                  {/* Status accent bar */}
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:4,background:PC.hex,borderRadius:"12px 12px 0 0" }} />
                  {site.hasIssue && (
                    <div style={{ position:"absolute",top:8,right:8,fontSize:13 }}>⚠️</div>
                  )}
                  <div style={{ marginTop:4 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:"#1a2a3a",lineHeight:1.3,marginBottom:2,paddingRight:16 }}>{site.name}</div>
                    <div style={{ fontSize:10,color:"#9aa8b8",marginBottom:10 }}>{site.region} · {site.employees.toLocaleString()} emp.</div>
                  </div>
                  {/* Mini category dots */}
                  <div style={{ display:"flex",gap:3,flexWrap:"wrap",marginBottom:10 }}>
                    {PULSE_CATEGORIES.map(cat=>{
                      const st = site.statuses[cat.key];
                      const c = PULSE_COLORS[st];
                      return (
                        <div key={cat.key} title={cat.label} style={{ width:22,height:22,borderRadius:5,background:c.light,border:`1px solid ${c.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11 }}>
                          {cat.icon}
                        </div>
                      );
                    })}
                  </div>
                  {/* Score bar */}
                  <div>
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#9aa8b8",marginBottom:3 }}>
                      <span>Health Score</span><span style={{ fontWeight:700,color:PC.text }}>{scorePct}%</span>
                    </div>
                    <div style={{ height:5,background:"#f0f4f8",borderRadius:3,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${scorePct}%`,background:PC.hex,borderRadius:3 }} />
                    </div>
                  </div>
                  {/* Overall badge — driven by weighted score, not just worst category */}
                  <div style={{ marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div style={{ fontSize:9,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.06em" }}>Overall</div>
                    <div style={{ fontSize:10,fontWeight:700,color:PC.text,background:PC.light,padding:"2px 7px",borderRadius:6,border:`1px solid ${PC.border}` }}>
                      {site.overallStatus==="green"?"🟢 Strong":site.overallStatus==="yellow"?"🟡 Moderate":"🔴 Needs Care"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HEAT MAP VIEW ── */}
      {viewMode === "heatmap" && (
        <div>
          <div style={{ fontSize:11,color:"#9aa8b8",marginBottom:10,fontStyle:"italic" }}>Each cell shows the status for that site × category combination. Click a row to open site detail.</div>
          {/* Header */}
          <div style={{ display:"grid",gridTemplateColumns:`160px repeat(${PULSE_CATEGORIES.length},1fr) 60px`,gap:3,marginBottom:6,alignItems:"center" }}>
            <div style={{ fontSize:10,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.07em",paddingLeft:6 }}>Site</div>
            {PULSE_CATEGORIES.map(cat=>(
              <div key={cat.key} style={{ textAlign:"center" }}>
                <div style={{ fontSize:16 }}>{cat.icon}</div>
                <div style={{ fontSize:9,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.04em",lineHeight:1.2 }}>{cat.short}</div>
              </div>
            ))}
            <div style={{ fontSize:9,color:"#9aa8b8",textTransform:"uppercase",textAlign:"center" }}>Score</div>
          </div>
          {/* Site rows */}
          {filteredSites.map((site,si)=>{
            const PC = PULSE_COLORS[site.overallStatus];
            const scorePct = Math.round(site.score / (PULSE_CATEGORIES.length*3) * 100);
            return (
              <div key={site.id} onClick={()=>setPopupSite(site)}
                style={{ display:"grid",gridTemplateColumns:`160px repeat(${PULSE_CATEGORIES.length},1fr) 60px`,gap:3,marginBottom:3,cursor:"pointer",borderRadius:8 }}
                onMouseEnter={e=>e.currentTarget.style.background="#f7f9fc"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{ fontSize:11,fontWeight:600,color:"#1a2a3a",paddingLeft:6,display:"flex",alignItems:"center",gap:5,overflow:"hidden" }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:PC.hex,flexShrink:0 }} />
                  <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{site.name}</span>
                </div>
                {PULSE_CATEGORIES.map(cat=>{
                  const st = site.statuses[cat.key];
                  const c = PULSE_COLORS[st];
                  return (
                    <div key={cat.key} style={{ background:c.hex,borderRadius:5,height:28,opacity:0.85 }} title={`${cat.label}: ${st}`} />
                  );
                })}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:PC.text,background:PC.light,padding:"2px 6px",borderRadius:5 }}>{scorePct}%</div>
                </div>
              </div>
            );
          })}
          {/* Category summary row */}
          <div style={{ display:"grid",gridTemplateColumns:`160px repeat(${PULSE_CATEGORIES.length},1fr) 60px`,gap:3,marginTop:10,paddingTop:10,borderTop:"2px solid #e8edf2" }}>
            <div style={{ fontSize:10,color:"#9aa8b8",textTransform:"uppercase",paddingLeft:6,display:"flex",alignItems:"center" }}>Category avg</div>
            {catAgg.map(cat=>{
              const c = PULSE_COLORS[cat.worst];
              return (
                <div key={cat.key} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:c.text }}>{Math.round(cat.green/(cat.green+cat.yellow+cat.red)*100)}%</div>
                  <div style={{ fontSize:9,color:"#9aa8b8" }}>green</div>
                </div>
              );
            })}
            <div />
          </div>
          {/* Color legend */}
          <div style={{ display:"flex",gap:12,marginTop:12,padding:"8px 12px",background:"#f7f9fc",borderRadius:8,flexWrap:"wrap",alignItems:"center" }}>
            {[["#27ae60","Positive"],["#f39c12","Monitor"],["#e74c3c","Concern"]].map(([col,lbl])=>(
              <div key={lbl} style={{ display:"flex",alignItems:"center",gap:6 }}>
                <div style={{ width:16,height:16,borderRadius:4,background:col,opacity:0.85 }} />
                <span style={{ fontSize:11,color:"#6b7a8d" }}>{lbl}</span>
              </div>
            ))}
            <div style={{ fontSize:11,color:"#9aa8b8",marginLeft:"auto",fontStyle:"italic" }}>Click any row to view site detail</div>
          </div>
        </div>
      )}

      {/* ── TREND VIEW ── */}
      {viewMode === "trend" && (
        <div>
          <div style={{ fontSize:11,color:"#9aa8b8",marginBottom:12,fontStyle:"italic" }}>Portfolio health score and status distribution across reporting periods.</div>
          {/* Health score area chart */}
          <div style={{ marginBottom:4 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#1a2a3a",marginBottom:6 }}>Portfolio Health Score Over Time</div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={trendData} margin={{ top:5,right:5,bottom:0,left:0 }}>
                <defs>
                  <linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={cc} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={cc} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                <XAxis dataKey="month" tick={{ fontSize:10,fill:"#9aa8b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tick={{ fontSize:10,fill:"#9aa8b8" }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={v=>[`${v}%`,"Health Score"]} contentStyle={{ fontSize:11,borderRadius:8 }} />
                <Area type="monotone" dataKey="score" stroke={cc} strokeWidth={2.5} fill="url(#phGrad)" dot={{ fill:cc,r:4,strokeWidth:0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Stacked status bars */}
          <div style={{ marginTop:16, marginBottom:4 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#1a2a3a",marginBottom:6 }}>Status Distribution by Period</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trendData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                <XAxis dataKey="month" tick={{ fontSize:10,fill:"#9aa8b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10,fill:"#9aa8b8" }} axisLine={false} tickLine={false} unit="%" domain={[0,100]} />
                <Tooltip formatter={v=>[`${v}%`]} contentStyle={{ borderRadius:8,fontSize:11 }} />
                <Legend wrapperStyle={{ fontSize:11 }} />
                <Bar dataKey="greenPct"  name="🟢 Positive" fill="#27ae60" stackId="a" radius={[0,0,0,0]} />
                <Bar dataKey="yellowPct" name="🟡 Monitor"  fill="#f39c12" stackId="a" radius={[0,0,0,0]} />
                <Bar dataKey="redPct"    name="🔴 Concern"  fill="#e74c3c" stackId="a" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Per-site scores this period */}
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#1a2a3a",marginBottom:8 }}>Current Period — Site Scores ({period.month})</div>
            <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
              {[...filteredSites].sort((a,b)=>b.score-a.score).map(site=>{
                const PC = PULSE_COLORS[site.overallStatus];
                const pct = Math.round(site.score/(PULSE_CATEGORIES.length*3)*100);
                return (
                  <div key={site.id} onClick={()=>setPopupSite(site)} style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"4px 6px",borderRadius:6,transition:"background 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#f7f9fc"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ fontSize:11,color:"#1a2a3a",fontWeight:600,width:190,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{site.name}</div>
                    <div style={{ flex:1,height:10,background:"#f0f4f8",borderRadius:5,overflow:"hidden" }}>
                      <div style={{ height:"100%",width:`${pct}%`,background:PC.hex,borderRadius:5,transition:"width 0.5s ease" }} />
                    </div>
                    <div style={{ fontSize:11,fontWeight:700,color:PC.text,width:36,textAlign:"right" }}>{pct}%</div>
                    {site.hasIssue && <span style={{ fontSize:12 }}>⚠️</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer legend */}
      <div style={{ display:"flex",gap:14,marginTop:16,padding:"10px 14px",background:"#f7f9fc",borderRadius:8,flexWrap:"wrap",alignItems:"center",borderTop:"1px solid #e8edf2" }}>
        <div style={{ fontSize:11,color:"#6b7a8d",fontWeight:600 }}>Legend:</div>
        {[["🟢","Positive — No concerns"],["🟡","Monitor — Mild concerns"],["🔴","Concern — Needs attention"]].map(([dot,lbl])=>(
          <div key={lbl} style={{ fontSize:11,color:"#6b7a8d",display:"flex",alignItems:"center",gap:4 }}>{dot} {lbl}</div>
        ))}
        <div style={{ fontSize:11,color:"#9aa8b8",marginLeft:"auto",fontStyle:"italic" }}>Powered by Marketplace Ministries Chaplain Data</div>
      </div>
    </div>
  );
}

function ECRBlockContent({ block, client, editMode, onTextChange, onDrill }) {
  const cc = client.color;
  switch (block.type) {
    case "cover_slide":
      return (
        <div style={{ background:`linear-gradient(135deg,${cc} 0%,${cc}cc 100%)`,borderRadius:12,padding:"48px 40px",color:"#fff",textAlign:"center" }}>
          <div style={{ fontSize:13,letterSpacing:"0.12em",textTransform:"uppercase",opacity:0.75,marginBottom:12,fontFamily:"'Georgia',serif" }}>Employee Care Report</div>
          <div style={{ width:64,height:64,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,margin:"0 auto 20px",border:"2px solid rgba(255,255,255,0.4)" }}>{client.logo}</div>
          <h1 style={{ fontSize:32,fontWeight:700,fontFamily:"'Georgia',serif",margin:"0 0 8px" }}>{client.name}</h1>
          <div style={{ fontSize:15,opacity:0.8 }}>August 2024 – January 2025</div>
          <div style={{ marginTop:24,paddingTop:24,borderTop:"1px solid rgba(255,255,255,0.25)",fontSize:13,opacity:0.7 }}>Prepared by Marketplace Ministries</div>
        </div>
      );
    case "kpi_row":
      return (
        <div>
          <h3 style={ECR_ST}>At a Glance</h3>
          <DrillHint />
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
            {ECR_MOCK.kpis.map((k,i)=>(
              <div key={i} onClick={()=>onDrill("kpi_card",k.key)}
                style={{ background:"#f7f9fc",borderRadius:10,padding:"18px 16px",borderLeft:`4px solid ${cc}`,cursor:"pointer",transition:"transform 0.15s,box-shadow 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)"}}
                onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none"}}>
                <div style={{ fontSize:26,fontWeight:700,color:cc,fontFamily:"'Georgia',serif" }}>{k.value}</div>
                <div style={{ fontSize:12,color:"#6b7a8d",marginTop:4 }}>{k.label}</div>
                <div style={{ fontSize:12,marginTop:6,color:k.positive?"#27ae60":"#e74c3c",fontWeight:600 }}>{k.delta} vs prior</div>
                <div style={{ fontSize:10,color:"#b0bcc8",marginTop:6 }}>Click for trend →</div>
              </div>
            ))}
          </div>
        </div>
      );
    case "interactions":
      return (
        <div>
          <h3 style={ECR_ST}>Interaction Trends</h3>
          <p style={ECR_Sub}>Monthly visit and follow-up activity across all chaplain touchpoints.</p>
          <DrillHint />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ECR_MOCK.interactions} barSize={22} onClick={e=>e?.activeLabel&&onDrill("interactions_month",e.activeLabel)} style={{ cursor:"pointer" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
              <XAxis dataKey="month" tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius:8,border:"1px solid #e0e6ef",fontSize:13 }} cursor={{ fill:`${cc}18` }} />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Bar dataKey="visits" name="Visits" fill={cc} radius={[4,4,0,0]} />
              <Bar dataKey="followups" name="Follow-ups" fill={cc+"88"} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    case "sentiment":
      return (
        <div>
          <h3 style={ECR_ST}>Employee Sentiment</h3>
          <p style={ECR_Sub}>Self-reported sentiment from chaplain interaction logs.</p>
          <DrillHint />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={ECR_MOCK.sentiment} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="category"
                label={({category,percent})=>`${category} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}
                style={{ cursor:"pointer" }} onClick={entry=>onDrill("sentiment_slice",entry.category)}>
                {ECR_MOCK.sentiment.map((entry,i)=><Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={v=>[`${v}%`,"Share"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );
    case "demographics":
      return (
        <div>
          <h3 style={ECR_ST}>Department Breakdown</h3>
          <p style={ECR_Sub}>Distribution of interactions by department.</p>
          <DrillHint />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ECR_MOCK.demographics} layout="vertical" barSize={18} onClick={e=>e?.activeLabel&&onDrill("demo_dept",e.activeLabel)} style={{ cursor:"pointer" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} unit="%" />
              <YAxis dataKey="dept" type="category" width={80} tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={v=>[`${v}%`,"Share"]} contentStyle={{ borderRadius:8 }} cursor={{ fill:`${cc}18` }} />
              <Bar dataKey="pct" name="%" fill={cc} radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    case "crisis":
      return (
        <div>
          <h3 style={ECR_ST}>Crisis & Referral Summary</h3>
          <p style={ECR_Sub}>Categories of elevated care needs requiring chaplain intervention or referral.</p>
          <DrillHint />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ECR_MOCK.crisis} barSize={22} onClick={e=>e?.activeLabel&&onDrill("crisis_type",e.activeLabel)} style={{ cursor:"pointer" }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
              <XAxis dataKey="type" tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius:8 }} cursor={{ fill:"#8e44ad22" }} />
              <Bar dataKey="count" name="Cases" fill="#8e44ad" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    case "text_block":
      return (
        <div>
          <h3 style={ECR_ST}>Chaplain Observations</h3>
          {editMode
            ? <textarea value={block.text} onChange={e=>onTextChange(block.id,e.target.value)} style={{ width:"100%",minHeight:100,fontSize:14,lineHeight:1.7,color:"#2c3e50",border:"1.5px solid #c5d0de",borderRadius:8,padding:"12px 14px",fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box" }} />
            : <p style={{ fontSize:14,lineHeight:1.8,color:"#2c3e50",margin:0 }}>{block.text}</p>
          }
        </div>
      );
    case "image_block":
      return (
        <div style={{ textAlign:"center",padding:"24px 0" }}>
          <div style={{ width:"100%",height:120,background:"#f0f4f8",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:"#9aa8b8",fontSize:14,border:"2px dashed #d0dae6" }}>{"🖼️  Click to upload image or logo"}</div>
        </div>
      );
    case "divider":
      return <div style={{ borderTop:`2px solid ${cc}22`,margin:"8px 0" }} />;
    case "pulse_report":
      return <PulseReportBlock client={client} cc={cc} />;
    default:
      return <div style={{ color:"#999",fontSize:13 }}>Unknown block type</div>;
  }
}

// ── ECR Report Builder (embedded) ─────────────────────────────────────────────
function ECRBuilder({ preselectedClient, allClients, onBack }) {
  const ecrClients = allClients.map(c => ({ id:c.id, name:c.name, logo:c.logo, color:c.color }));
  const [selectedClient, setSelectedClient] = useState(preselectedClient ? { id:preselectedClient.id, name:preselectedClient.name, logo:preselectedClient.logo, color:preselectedClient.color } : ecrClients[0]);
  const [blocks, setBlocks] = useState(ECR_DEFAULT_BLOCKS);
  const [editMode, setEditMode] = useState(false);
  const [activeBlock, setActiveBlock] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [view, setView] = useState("builder");
  const [dateRange, setDateRange] = useState("Aug 2024 – Jan 2025");
  const [drill, setDrill] = useState(null);
  const nextId = useRef(100);
  const cc = selectedClient.color;

  const openDrill = (blockType, key) => { const d = buildECRDrill(blockType, key, selectedClient); if (d) setDrill(d); };
  const addBlock = (type) => setBlocks(p=>[...p,{ id:nextId.current++, type, text:type==="text_block"?"Enter your observations here...":"", edits:{} }]);
  const removeBlock = (id) => setBlocks(p=>p.filter(b=>b.id!==id));
  const moveBlock = (id, dir) => {
    const idx = blocks.findIndex(b=>b.id===id);
    if (dir==="up"&&idx===0) return; if (dir==="down"&&idx===blocks.length-1) return;
    const nb=[...blocks]; [nb[idx],nb[dir==="up"?idx-1:idx+1]]=[nb[dir==="up"?idx-1:idx+1],nb[idx]]; setBlocks(nb);
  };
  const updateText = (id, text) => setBlocks(p=>p.map(b=>b.id===id?{...b,text}:b));
  const onDragStart = (id) => setDragging(id);
  const onDragOver = (e, id) => { e.preventDefault(); setDragOver(id); };
  const onDrop = (targetId) => {
    if (!dragging||dragging===targetId){setDragging(null);setDragOver(null);return;}
    const from=blocks.findIndex(b=>b.id===dragging), to=blocks.findIndex(b=>b.id===targetId);
    const nb=[...blocks]; const [moved]=nb.splice(from,1); nb.splice(to,0,moved);
    setBlocks(nb); setDragging(null); setDragOver(null);
  };

  return (
    <div style={{ minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>
      <ECRDrillModal drill={drill} client={selectedClient} onClose={()=>setDrill(null)} />

      {/* Sub-header */}
      <div style={{ background:"#fff",borderBottom:"1px solid #e0e6ef",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52 }}>
        <div style={{ display:"flex",alignItems:"center",gap:14 }}>
          <button onClick={onBack} style={{ border:"none",background:"transparent",cursor:"pointer",fontSize:13,color:"#6b7a8d",display:"flex",alignItems:"center",gap:6,padding:"4px 0" }}>← Dashboard</button>
          <div style={{ width:1,height:20,background:"#e0e6ef" }} />
          <div style={{ fontSize:15,fontWeight:700,color:"#1a2a3a" }}>ECR Report Builder</div>
          <div style={{ width:1,height:20,background:"#e0e6ef" }} />
          <select value={selectedClient.id} onChange={e=>setSelectedClient(ecrClients.find(c=>c.id===e.target.value)||ecrClients[0])}
            style={{ fontSize:13,border:"1px solid #d0dae6",borderRadius:6,padding:"5px 10px",color:"#1a2a3a",background:"#fff",cursor:"pointer" }}>
            {ecrClients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={dateRange} onChange={e=>setDateRange(e.target.value)}
            style={{ fontSize:13,border:"1px solid #d0dae6",borderRadius:6,padding:"5px 10px",color:"#6b7a8d",width:180 }} />
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          {["builder","preview"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:"6px 14px",borderRadius:7,border:"none",fontSize:13,fontWeight:view===v?700:400,background:view===v?"#f0f4f8":"transparent",color:view===v?"#1a2a3a":"#6b7a8d",cursor:"pointer" }}>
              {v==="builder"?"✏️ Builder":"👁 Preview"}
            </button>
          ))}
          <div style={{ width:1,height:20,background:"#e0e6ef" }} />
          <button style={{ padding:"7px 16px",borderRadius:7,border:"none",fontSize:13,fontWeight:600,background:cc,color:"#fff",cursor:"pointer" }}>Export PDF</button>
          <button style={{ padding:"7px 16px",borderRadius:7,border:`1.5px solid ${cc}`,fontSize:13,fontWeight:600,background:"transparent",color:cc,cursor:"pointer" }}>Share Link</button>
        </div>
      </div>

      {view==="builder" ? (
        <div style={{ display:"flex",maxWidth:1200,margin:"0 auto",padding:"24px 16px",gap:20 }}>
          {/* Left Panel */}
          <div style={{ width:220,flexShrink:0 }}>
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",overflow:"hidden" }}>
              <div style={{ padding:"14px 16px",borderBottom:"1px solid #e8edf2",fontSize:12,fontWeight:700,color:"#6b7a8d",letterSpacing:"0.08em",textTransform:"uppercase" }}>Add Sections</div>
              {["Data","Content","Layout"].map(cat=>(
                <div key={cat}>
                  <div style={{ padding:"10px 16px 4px",fontSize:11,color:"#9aa8b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em" }}>{cat}</div>
                  {ECR_BLOCK_LIBRARY.filter(b=>b.category===cat).map(b=>(
                    <div key={b.type} onClick={()=>addBlock(b.type)}
                      style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 16px",cursor:"pointer",fontSize:13,color:"#2c3e50" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#f5f8fc"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{ fontSize:15 }}>{b.icon}</span>{b.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginTop:16,background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"14px 16px" }}>
              <div style={{ fontSize:12,fontWeight:700,color:"#6b7a8d",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10 }}>Options</div>
              <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#2c3e50",cursor:"pointer" }}>
                <input type="checkbox" checked={editMode} onChange={e=>setEditMode(e.target.checked)} style={{ accentColor:cc }} />
                Edit text inline
              </label>
            </div>
            <div style={{ marginTop:12,background:`${cc}0d`,borderRadius:12,border:`1px solid ${cc}33`,padding:"12px 14px" }}>
              <div style={{ fontSize:11,fontWeight:700,color:cc,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6 }}>💡 Tip</div>
              <div style={{ fontSize:12,color:"#2c3e50",lineHeight:1.6 }}>Click any chart bar, pie slice, or KPI card to open a drill-down modal with deeper data.</div>
            </div>
          </div>

          {/* Canvas */}
          <div style={{ flex:1 }}>
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",overflow:"hidden" }}>
              <div style={{ padding:"14px 20px",borderBottom:"1px solid #e8edf2",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ fontSize:13,color:"#6b7a8d" }}><strong style={{ color:"#1a2a3a" }}>{blocks.length}</strong> sections {" · "} Drag to reorder</div>
                <div style={{ fontSize:12,color:"#9aa8b8" }}>Client: <strong style={{ color:cc }}>{selectedClient.name}</strong></div>
              </div>
              <div style={{ padding:"16px 20px",display:"flex",flexDirection:"column",gap:12 }}>
                {blocks.map((block,idx)=>(
                  <div key={block.id} draggable
                    onDragStart={()=>onDragStart(block.id)}
                    onDragOver={e=>onDragOver(e,block.id)}
                    onDrop={()=>onDrop(block.id)}
                    onDragEnd={()=>{setDragging(null);setDragOver(null);}}
                    style={{ border:dragOver===block.id?`2px dashed ${cc}`:activeBlock===block.id?`2px solid ${cc}`:"1.5px solid #e8edf2",borderRadius:10,background:dragging===block.id?"#f5f8fc":"#fff",opacity:dragging===block.id?0.5:1,transition:"border-color 0.15s,box-shadow 0.15s",boxShadow:activeBlock===block.id?`0 0 0 4px ${cc}18`:"none",cursor:"grab" }}
                    onClick={()=>setActiveBlock(block.id===activeBlock?null:block.id)}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderBottom:"1px solid #f0f4f8",background:"#fafbfd",borderRadius:"8px 8px 0 0" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ color:"#9aa8b8",fontSize:14 }}>⠿</span>
                        <span style={{ fontSize:11,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.06em" }}>{ECR_BLOCK_LIBRARY.find(b=>b.type===block.type)?.label||block.type}</span>
                      </div>
                      <div style={{ display:"flex",gap:4 }}>
                        {[["↑","up",idx===0],["↓","down",idx===blocks.length-1],["✕","del",false]].map(([icon,dir,dis])=>(
                          <button key={dir} disabled={dis} onClick={e=>{e.stopPropagation();dir==="del"?removeBlock(block.id):moveBlock(block.id,dir);}}
                            style={{ width:24,height:24,borderRadius:5,border:"none",background:"transparent",color:dis?"#d0dae6":dir==="del"?"#e74c3c":"#6b7a8d",cursor:dis?"default":"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",padding:0,fontWeight:600 }}
                            onMouseEnter={e=>{if(!dis)e.currentTarget.style.background=dir==="del"?"#fdf0f0":"#f0f4f8"}}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{icon}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{ padding:"16px 20px" }}>
                      <ECRBlockContent block={block} client={selectedClient} editMode={editMode} onTextChange={updateText} onDrill={openDrill} />
                    </div>
                  </div>
                ))}
                <div style={{ border:"2px dashed #d0dae6",borderRadius:10,padding:20,textAlign:"center",color:"#9aa8b8",fontSize:13 }}>← Add sections from the panel on the left</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth:820,margin:"32px auto",padding:"0 16px 48px" }}>
          <div style={{ background:"#fff",borderRadius:14,boxShadow:"0 4px 32px rgba(0,0,0,0.10)",overflow:"hidden" }}>
            <div style={{ height:6,background:`linear-gradient(90deg,${cc},${cc}99)` }} />
            <div style={{ padding:"32px 40px",display:"flex",flexDirection:"column",gap:32 }}>
              {blocks.map(block=>(
                <div key={block.id}>
                  <ECRBlockContent block={block} client={selectedClient} editMode={false} onTextChange={()=>{}} onDrill={openDrill} />
                </div>
              ))}
              <div style={{ borderTop:"1px solid #e8edf2",paddingTop:20,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ fontSize:12,color:"#9aa8b8" }}>Marketplace Ministries · Confidential</div>
                <div style={{ fontSize:12,color:"#9aa8b8" }}>{dateRange}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const HEALTH = {
  green:  { bg:"#eafaf1", text:"#1e8449", dot:"#27ae60" },
  yellow: { bg:"#fef9e7", text:"#9a6e00", dot:"#f39c12" },
  red:    { bg:"#fdedec", text:"#922b21", dot:"#e74c3c" },
};

const ERROR_CATEGORIES = ["Access Issue","Scheduling Conflict","Chaplain No-Show","Facility Restriction","Employee Incident","Data / Reporting Error","Communication Breakdown","Safety Concern","Other"];
const VISIT_TYPES = ["Scheduled Visit","Crisis Response","Follow-up Visit","New Client Orientation","Chaplain Check-in","Leadership Meeting","Other"];
const EXPENSE_TYPES = ["Mileage","Meal / Entertainment","Hotel","Airfare","Ground Transport","Other"];

function daysUntil(d){ return Math.round((new Date(d)-new Date())/86400000); }
function formatDate(d){ return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function today(){ return new Date().toISOString().split("T")[0]; }

// ── Shared Drawer Shell ───────────────────────────────────────────────────────
function Drawer({ onClose, children, width=560 }) {
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(10,20,40,0.5)",zIndex:300,display:"flex",justifyContent:"flex-end",backdropFilter:"blur(2px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width,background:"#fff",height:"100%",overflow:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column" }}>
        {children}
      </div>
    </div>
  );
}

function DrawerHeader({ title, subtitle, color, onClose, icon }) {
  return (
    <div style={{ background:`linear-gradient(135deg,${color},${color}dd)`,padding:"24px 28px",color:"#fff",flexShrink:0 }}>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:"2px solid rgba(255,255,255,0.3)" }}>{icon}</div>
          <div>
            <div style={{ fontSize:19,fontWeight:700,fontFamily:"'Georgia',serif" }}>{title}</div>
            <div style={{ fontSize:13,opacity:0.8,marginTop:2 }}>{subtitle}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ border:"none",background:"rgba(255,255,255,0.2)",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
      </div>
    </div>
  );
}

function FieldLabel({ children, required }) {
  return <div style={{ fontSize:12,fontWeight:700,color:"#4a5568",marginBottom:6,display:"flex",gap:4 }}>{children}{required&&<span style={{ color:"#e74c3c" }}>*</span>}</div>;
}

function Input({ value, onChange, placeholder, type="text", style={} }) {
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
    style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #d0dae6",fontSize:13,color:"#1a2a3a",background:"#fff",outline:"none",boxSizing:"border-box",transition:"border-color 0.15s",...style }}
    onFocus={e=>e.target.style.borderColor="#1a4a7a"} onBlur={e=>e.target.style.borderColor="#d0dae6"} />;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #d0dae6",fontSize:13,color:value?"#1a2a3a":"#9aa8b8",background:"#fff",outline:"none",cursor:"pointer" }}>
      {placeholder&&<option value="">{placeholder}</option>}
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows=3 }) {
  return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #d0dae6",fontSize:13,color:"#1a2a3a",fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.6 }}
    onFocus={e=>e.target.style.borderColor="#1a4a7a"} onBlur={e=>e.target.style.borderColor="#d0dae6"} />;
}

function FormSection({ title, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:11,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14,paddingBottom:8,borderBottom:"1px solid #f0f4f8" }}>{title}</div>
      <div style={{ display:"flex",flexDirection:"column",gap:14 }}>{children}</div>
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display:"grid",gridTemplateColumns:`repeat(${children.length},1fr)`,gap:12 }}>{children}</div>;
}

function SuccessBanner({ message, onDismiss }) {
  return (
    <div style={{ margin:"16px 28px 0",padding:"12px 16px",background:"#eafaf1",borderRadius:10,border:"1px solid #a9dfbf",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#1e8449",fontWeight:600 }}>
        <span style={{ fontSize:16 }}>✅</span> {message}
      </div>
      <button onClick={onDismiss} style={{ border:"none",background:"transparent",cursor:"pointer",fontSize:16,color:"#27ae60" }}>✕</button>
    </div>
  );
}

// ── Time & Expense Drawer ─────────────────────────────────────────────────────
function TimeExpenseDrawer({ client, user, onClose }) {
  const cc = "#1a4a7a";
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    date: today(), startTime:"", endTime:"", totalHours:"",
    expenses:[{ type:"", amount:"", description:"", receipt:false }],
    notes:"", project:"", approver: user.vpName,
  });

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const setExp = (i,k,v) => setForm(p=>({ ...p, expenses:p.expenses.map((e,idx)=>idx===i?{...e,[k]:v}:e) }));
  const addExp = () => setForm(p=>({...p,expenses:[...p.expenses,{type:"",amount:"",description:"",receipt:false}]}));
  const removeExp = (i) => setForm(p=>({...p,expenses:p.expenses.filter((_,idx)=>idx!==i)}));

  const totalExpenses = form.expenses.reduce((a,e)=>a+(parseFloat(e.amount)||0),0);
  const calcHours = () => {
    if (form.startTime && form.endTime) {
      const [sh,sm]=form.startTime.split(":").map(Number), [eh,em]=form.endTime.split(":").map(Number);
      const diff=((eh*60+em)-(sh*60+sm))/60;
      if(diff>0) set("totalHours",diff.toFixed(1));
    }
  };

  return (
    <Drawer onClose={onClose}>
      <DrawerHeader title="Time & Expense Entry" subtitle={`${client.name} · ${formatDate(form.date)}`} color={cc} onClose={onClose} icon="⏱️" />
      {submitted && <SuccessBanner message="Entry submitted successfully!" onDismiss={()=>setSubmitted(false)} />}
      <div style={{ padding:"24px 28px",flex:1,overflow:"auto" }}>

        <FormSection title="Time Entry">
          <div><FieldLabel required>Client</FieldLabel>
            <div style={{ padding:"9px 12px",background:"#f7f9fc",borderRadius:8,fontSize:13,color:"#1a2a3a",border:"1.5px solid #e8edf2" }}>{client.name}</div>
          </div>
          <Row>
            <div><FieldLabel required>Date</FieldLabel><Input type="date" value={form.date} onChange={v=>set("date",v)} /></div>
            <div><FieldLabel>Project / Activity</FieldLabel><Select value={form.project} onChange={v=>set("project",v)} placeholder="Select type..." options={["Client Visit","Report Preparation","Chaplain Supervision","Admin","Travel","Training"]} /></div>
          </Row>
          <Row>
            <div><FieldLabel>Start Time</FieldLabel><Input type="time" value={form.startTime} onChange={v=>{set("startTime",v);}} onBlur={calcHours} /></div>
            <div><FieldLabel>End Time</FieldLabel><Input type="time" value={form.endTime} onChange={v=>{set("endTime",v);setTimeout(calcHours,100)}} /></div>
            <div><FieldLabel required>Total Hours</FieldLabel><Input type="number" value={form.totalHours} onChange={v=>set("totalHours",v)} placeholder="0.0" /></div>
          </Row>
          <div><FieldLabel>Approver</FieldLabel>
            <div style={{ padding:"9px 12px",background:"#f7f9fc",borderRadius:8,fontSize:13,color:"#6b7a8d",border:"1.5px solid #e8edf2" }}>{user.vpName} (auto-assigned)</div>
          </div>
        </FormSection>

        <FormSection title="Expenses">
          {form.expenses.map((exp,i)=>(
            <div key={i} style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px",border:"1.5px solid #e8edf2" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#6b7a8d" }}>Expense {i+1}</div>
                {i>0&&<button onClick={()=>removeExp(i)} style={{ border:"none",background:"transparent",color:"#e74c3c",cursor:"pointer",fontSize:12,fontWeight:600 }}>Remove</button>}
              </div>
              <Row>
                <div><FieldLabel required>Type</FieldLabel><Select value={exp.type} onChange={v=>setExp(i,"type",v)} placeholder="Select..." options={EXPENSE_TYPES} /></div>
                <div><FieldLabel required>Amount ($)</FieldLabel><Input value={exp.amount} onChange={v=>setExp(i,"amount",v)} placeholder="0.00" type="number" /></div>
              </Row>
              <div style={{ marginTop:12 }}><FieldLabel>Description</FieldLabel><Input value={exp.description} onChange={v=>setExp(i,"description",v)} placeholder={exp.type==="Mileage"?"e.g. Round trip to client HQ (42 miles)":"e.g. Team lunch with chaplain"} /></div>
              <label style={{ display:"flex",alignItems:"center",gap:8,marginTop:10,fontSize:13,color:"#4a5568",cursor:"pointer" }}>
                <input type="checkbox" checked={exp.receipt} onChange={e=>setExp(i,"receipt",e.target.checked)} style={{ accentColor:cc }} />
                Receipt attached
              </label>
            </div>
          ))}
          <button onClick={addExp} style={{ width:"100%",padding:"9px",borderRadius:8,border:"2px dashed #d0dae6",background:"transparent",color:"#6b7a8d",fontSize:13,cursor:"pointer",fontWeight:600 }}>
            + Add Another Expense
          </button>
          {form.expenses.some(e=>e.amount) && (
            <div style={{ display:"flex",justifyContent:"flex-end",padding:"8px 4px 0",fontSize:14,fontWeight:700,color:cc }}>
              Total: ${totalExpenses.toFixed(2)}
            </div>
          )}
        </FormSection>

        <FormSection title="Notes">
          <div><FieldLabel>Additional Notes</FieldLabel><Textarea value={form.notes} onChange={v=>set("notes",v)} placeholder="Any context for this time or expense entry..." rows={3} /></div>
        </FormSection>
      </div>

      <div style={{ padding:"16px 28px",borderTop:"1px solid #e8edf2",display:"flex",gap:10,flexShrink:0 }}>
        <button onClick={()=>{setSubmitted(true);window.scrollTo(0,0);}} style={{ flex:1,padding:"12px",borderRadius:10,border:"none",background:cc,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer" }}>
          Submit Entry
        </button>
        <button onClick={()=>setForm(p=>({...p,_saved:true}))} style={{ padding:"12px 18px",borderRadius:10,border:`1.5px solid ${cc}`,background:"transparent",color:cc,fontSize:13,fontWeight:600,cursor:"pointer" }}>
          Save Draft
        </button>
        <button onClick={onClose} style={{ padding:"12px 18px",borderRadius:10,border:"1px solid #d0dae6",background:"transparent",color:"#6b7a8d",fontSize:13,cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </Drawer>
  );
}

// ── On-Site Visit Drawer ──────────────────────────────────────────────────────
// ── Interaction Types (for visit log) ────────────────────────────────────────
const INTERACTION_TYPES = [
  { key:"supportive",   label:"Supportive Listening",    icon:"🤝" },
  { key:"grief",        label:"Grief & Bereavement",      icon:"🕊️" },
  { key:"crisis",       label:"Crisis Support",           icon:"🆘" },
  { key:"spiritual",    label:"Spiritual / Faith",        icon:"✦"  },
  { key:"stress",       label:"Workplace Stress",         icon:"🏢" },
  { key:"family",       label:"Family & Relationships",   icon:"🏠" },
  { key:"health",       label:"Health & Wellbeing",       icon:"💙" },
  { key:"financial",    label:"Financial Concerns",       icon:"💼" },
  { key:"conflict",     label:"Conflict Resolution",      icon:"⚖️" },
  { key:"celebration",  label:"Celebration / Milestone",  icon:"🌟" },
  { key:"prayer",       label:"Prayer / Ritual",          icon:"🙏" },
  { key:"informal",     label:"Informal / Casual",        icon:"☕" },
  { key:"group",        label:"Group Session",            icon:"👥" },
  { key:"referral",     label:"Referral Follow-up",       icon:"🔗" },
];

// ── On-Site Visit Drawer (Chaplain-friendly redesign) ─────────────────────────
function OnSiteVisitDrawer({ client, user, onClose }) {
  const cc = "#1a4a7a";
  const accentGreen = "#0e6655";
  const [step, setStep] = useState(1); // 1=basics, 2=interactions, 3=narrative, 4=issues
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef();
  const [photoNames, setPhotoNames] = useState([]);

  const [form, setForm] = useState({
    date: today(),
    visitType: "",
    duration: "",
    chaplains: [],
    interactions: {}, // key → count
    totalEmployees: "",
    followUpNeeded: false,
    followUpNotes: "",
    periodOverview: "",
    themes: "",
    recommendations: "",
    referrals: "",
    personalReflection: "",
    siteWellbeing: "",
    availabilityNext: "Full availability",
    flagIncident: false,
  });

  const [issues, setIssues] = useState([]);
  const [issueForm, setIssueForm] = useState({ category:"", severity:"medium", description:"", resolution:"", reportToVP:false });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setCount = (key, delta) => setForm(p => {
    const cur = p.interactions[key] || 0;
    const next = Math.max(0, cur + delta);
    return { ...p, interactions: { ...p.interactions, [key]: next } };
  });
  const toggleChaplain = (name) => set("chaplains",
    form.chaplains.includes(name) ? form.chaplains.filter(c => c !== name) : [...form.chaplains, name]
  );

  const totalInteractions = Object.values(form.interactions).reduce((a, b) => a + b, 0);

  const STEPS = [
    { n:1, label:"Visit Info",      icon:"📋" },
    { n:2, label:"Conversations",   icon:"💬" },
    { n:3, label:"Reflection",      icon:"✍️"  },
    { n:4, label:"Issues",          icon:"⚠️"  },
  ];

  const canAdvance = () => {
    if (step === 1) return form.date && form.visitType && form.chaplains.length > 0;
    if (step === 2) return true;
    if (step === 3) return form.periodOverview.trim().length > 0;
    return true;
  };

  const SEVERITY = { low:{ bg:"#eafaf1",text:"#1e8449",label:"Low" }, medium:{ bg:"#fef9e7",text:"#9a6e00",label:"Medium" }, high:{ bg:"#fdedec",text:"#922b21",label:"High" } };
  const addIssue = () => {
    if (!issueForm.category || !issueForm.description) return;
    setIssues(p => [...p, { ...issueForm, id:Date.now() }]);
    setIssueForm({ category:"", severity:"medium", description:"", resolution:"", reportToVP:false });
  };

  // Warm off-white background matching the reference
  const pageBg = "#f7f5f0";
  const cardBg = "#fff";
  const borderCol = "#e4ddd4";
  const labelColor = "#7a6a5a";
  const textColor = "#2c2416";

  const StepHeader = () => (
    <div style={{ padding:"18px 24px 14px",borderBottom:`1px solid ${borderCol}`,background:pageBg,flexShrink:0 }}>
      <div style={{ display:"flex",gap:6,justifyContent:"center" }}>
        {STEPS.map(s => (
          <button key={s.n} onClick={()=>s.n<step||canAdvance()?setStep(s.n):null}
            style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:20,border:"none",cursor:s.n<=step?"pointer":"default",
              background:s.n===step?cc:s.n<step?"#e8f0f8":"transparent",
              color:s.n===step?"#fff":s.n<step?cc:labelColor,
              fontSize:12,fontWeight:s.n===step?700:500,transition:"all 0.15s" }}>
            <span style={{ fontSize:13 }}>{s.icon}</span>
            <span style={{ display:s.n===step?"inline":"none" }}>{s.label}</span>
            {s.n < step && <span style={{ fontSize:10 }}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );

  const SectionTitle = ({ children }) => (
    <div style={{ fontSize:11,fontWeight:700,color:labelColor,textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:14,paddingBottom:8,borderBottom:`1px solid ${borderCol}` }}>
      {children}
    </div>
  );

  const BigLabel = ({ children, required, hint }) => (
    <div style={{ marginBottom:8 }}>
      <div style={{ fontSize:14,fontWeight:600,color:textColor,display:"flex",gap:4,alignItems:"center" }}>
        {children}{required && <span style={{ color:"#c0392b" }}>*</span>}
      </div>
      {hint && <div style={{ fontSize:12,color:labelColor,marginTop:2 }}>{hint}</div>}
    </div>
  );

  const BigInput = ({ value, onChange, placeholder, type="text" }) => (
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
      style={{ width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${borderCol}`,fontSize:15,color:textColor,background:cardBg,outline:"none",boxSizing:"border-box",fontFamily:"inherit",transition:"border-color 0.15s" }}
      onFocus={e=>e.target.style.borderColor=cc} onBlur={e=>e.target.style.borderColor=borderCol} />
  );

  const BigTextarea = ({ value, onChange, placeholder, rows=4 }) => (
    <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{ width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${borderCol}`,fontSize:14,color:textColor,background:cardBg,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical",lineHeight:1.65,transition:"border-color 0.15s" }}
      onFocus={e=>e.target.style.borderColor=cc} onBlur={e=>e.target.style.borderColor=borderCol} />
  );

  const BigSelect = ({ value, onChange, options, placeholder }) => (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%",padding:"12px 14px",borderRadius:10,border:`1.5px solid ${borderCol}`,fontSize:15,color:value?textColor:labelColor,background:cardBg,outline:"none",cursor:"pointer",fontFamily:"inherit" }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <Drawer onClose={onClose} width={620}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${cc},${cc}dd)`,padding:"20px 24px",color:"#fff",flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:"2px solid rgba(255,255,255,0.3)" }}>📍</div>
            <div>
              <div style={{ fontSize:18,fontWeight:700,fontFamily:"'Georgia',serif" }}>Log Site Visit</div>
              <div style={{ fontSize:13,opacity:0.82,marginTop:2 }}>{client.name} · {formatDate(form.date)}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border:"none",background:"rgba(255,255,255,0.18)",borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:16,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
      </div>

      <StepHeader />

      {submitted ? (
        <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 28px",background:pageBg,textAlign:"center" }}>
          <div style={{ fontSize:52,marginBottom:16 }}>✅</div>
          <div style={{ fontSize:22,fontWeight:700,color:textColor,fontFamily:"'Georgia',serif",marginBottom:8 }}>Visit Recorded!</div>
          <div style={{ fontSize:14,color:labelColor,marginBottom:28,lineHeight:1.6 }}>
            Your visit log for <strong>{client.name}</strong> has been saved.<br/>
            {totalInteractions > 0 && `${totalInteractions} conversations logged.`}
          </div>
          <button onClick={onClose} style={{ padding:"13px 36px",borderRadius:12,border:"none",background:cc,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer" }}>
            Done
          </button>
        </div>
      ) : (
        <div style={{ flex:1,overflow:"auto",background:pageBg }}>

          {/* ── STEP 1: VISIT INFO ── */}
          {step === 1 && (
            <div style={{ padding:"24px" }}>
              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"22px 22px",marginBottom:16 }}>
                <SectionTitle>When & Where</SectionTitle>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14 }}>
                  <div>
                    <BigLabel required>Date of Visit</BigLabel>
                    <BigInput type="date" value={form.date} onChange={v=>set("date",v)} />
                  </div>
                  <div>
                    <BigLabel required>Type of Visit</BigLabel>
                    <BigSelect value={form.visitType} onChange={v=>set("visitType",v)} placeholder="Select type..."
                      options={["Scheduled Visit","Crisis Response","Follow-up Visit","New Client Orientation","Chaplain Check-in","Leadership Meeting","Other"]} />
                  </div>
                </div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                  <div>
                    <BigLabel>Location / Site</BigLabel>
                    <BigInput value={form.location||""} onChange={v=>set("location",v)} placeholder="e.g. Main Plant, Building A" />
                  </div>
                  <div>
                    <BigLabel>How Long Were You There?</BigLabel>
                    <BigSelect value={form.duration} onChange={v=>set("duration",v)} placeholder="Select duration..."
                      options={["Under 1 hour","1–2 hours","2–4 hours","4–6 hours","Full day","Multi-day"]} />
                  </div>
                </div>
              </div>

              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"22px 22px",marginBottom:16 }}>
                <SectionTitle>Chaplains Present</SectionTitle>
                <div style={{ fontSize:13,color:labelColor,marginBottom:14 }}>Tap to select everyone who was on-site today</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:10 }}>
                  {client.chaplainNames.map(name => {
                    const sel = form.chaplains.includes(name);
                    return (
                      <button key={name} onClick={()=>toggleChaplain(name)}
                        style={{ padding:"11px 18px",borderRadius:12,border:`2px solid ${sel?cc:borderCol}`,background:sel?cc:"#fff",color:sel?"#fff":textColor,fontSize:14,fontWeight:sel?700:500,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:7 }}>
                        {sel && <span style={{ fontSize:13 }}>✓</span>}
                        {name}
                      </button>
                    );
                  })}
                </div>
                {form.chaplains.length === 0 && <div style={{ fontSize:13,color:"#c0392b",marginTop:10 }}>Please select at least one chaplain</div>}
              </div>

              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"22px 22px" }}>
                <SectionTitle>People Reached</SectionTitle>
                <div style={{ maxWidth:200 }}>
                  <BigLabel hint="How many employees did your team interact with?">Total Employees Engaged</BigLabel>
                  <BigInput type="number" value={form.totalEmployees} onChange={v=>set("totalEmployees",v)} placeholder="e.g. 24" />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: CONVERSATIONS ── */}
          {step === 2 && (
            <div style={{ padding:"24px" }}>
              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"18px 22px 10px",marginBottom:16 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                  <SectionTitle>Total conversations this period</SectionTitle>
                  <div style={{ fontSize:28,fontWeight:700,color:cc,fontFamily:"'Georgia',serif",marginTop:-14 }}>{totalInteractions}</div>
                </div>
                <div style={{ fontSize:13,color:labelColor,marginBottom:18 }}>Tap + to count each type of conversation. You can log zero for types that didn't happen.</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
                  {INTERACTION_TYPES.map(({ key, label, icon }) => {
                    const count = form.interactions[key] || 0;
                    return (
                      <div key={key} style={{ background:count>0?"#eef4fb":pageBg,borderRadius:12,border:`1.5px solid ${count>0?cc:borderCol}`,padding:"14px 12px",transition:"all 0.15s" }}>
                        <div style={{ fontSize:22,marginBottom:6,lineHeight:1 }}>{icon}</div>
                        <div style={{ fontSize:12,fontWeight:600,color:textColor,marginBottom:12,lineHeight:1.3,minHeight:32 }}>{label}</div>
                        <div style={{ display:"flex",alignItems:"center",gap:0 }}>
                          <button onClick={()=>setCount(key,-1)} disabled={count===0}
                            style={{ width:34,height:34,borderRadius:"8px 0 0 8px",border:`1.5px solid ${borderCol}`,background:count>0?"#fff":"#f5f5f5",color:count>0?textColor:labelColor,fontSize:18,fontWeight:300,cursor:count>0?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1 }}>−</button>
                          <div style={{ flex:1,height:34,border:`1.5px solid ${borderCol}`,borderLeft:"none",borderRight:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:count>0?cc:labelColor,background:"#fff",minWidth:38 }}>{count}</div>
                          <button onClick={()=>setCount(key,1)}
                            style={{ width:34,height:34,borderRadius:"0 8px 8px 0",border:`1.5px solid ${borderCol}`,background:cc,color:"#fff",fontSize:18,fontWeight:300,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1 }}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"22px 22px" }}>
                <SectionTitle>Follow-Up Needed?</SectionTitle>
                <div style={{ display:"flex",gap:10,marginBottom:form.followUpNeeded?14:0 }}>
                  {[["No","No follow-up needed",false],["Yes","Someone needs follow-up",true]].map(([lbl,sub,val])=>(
                    <button key={lbl} onClick={()=>set("followUpNeeded",val)}
                      style={{ flex:1,padding:"14px 12px",borderRadius:12,border:`2px solid ${form.followUpNeeded===val?cc:borderCol}`,background:form.followUpNeeded===val?cc+"0f":"#fff",cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}>
                      <div style={{ fontSize:14,fontWeight:700,color:form.followUpNeeded===val?cc:textColor }}>{lbl}</div>
                      <div style={{ fontSize:12,color:labelColor,marginTop:2 }}>{sub}</div>
                    </button>
                  ))}
                </div>
                {form.followUpNeeded && (
                  <div>
                    <BigLabel hint="Don't use names — describe the situation or need">What kind of follow-up is needed?</BigLabel>
                    <BigTextarea value={form.followUpNotes} onChange={v=>set("followUpNotes",v)} placeholder="e.g. Employee in grief needs another check-in next week. Referral to EAP being arranged." rows={3} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: REFLECTION / NARRATIVE ── */}
          {step === 3 && (
            <div style={{ padding:"24px" }}>
              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"22px 22px",marginBottom:16 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:4 }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:cc+"15",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>✍️</div>
                  <div>
                    <div style={{ fontSize:16,fontWeight:700,color:textColor,fontFamily:"'Georgia',serif" }}>Narrative & Reflection</div>
                    <div style={{ fontSize:12,color:labelColor }}>Written summary — themes, observations, and personal reflection</div>
                  </div>
                </div>
              </div>

              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"22px",marginBottom:12 }}>
                <BigLabel required hint="Overall tone of the visit, key themes, how the chaplaincy presence was received">Period Overview</BigLabel>
                <BigTextarea value={form.periodOverview} onChange={v=>set("periodOverview",v)}
                  placeholder="Describe the overall tone of the period, key themes across conversations, significant events, and how the chaplaincy presence was received at this site..." rows={5} />
              </div>

              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"18px" }}>
                  <BigLabel hint="Without identifying individuals">Themes & Pastoral Concerns</BigLabel>
                  <BigTextarea value={form.themes} onChange={v=>set("themes",v)} placeholder="Recurring themes or areas of need observed — without identifying individuals..." rows={4} />
                </div>
                <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"18px" }}>
                  <BigLabel hint="Actions, resources, priorities for next period">Recommendations & Follow-up</BigLabel>
                  <BigTextarea value={form.recommendations} onChange={v=>set("recommendations",v)} placeholder="Suggested actions, resource needs, or priorities for the next period..." rows={4} />
                </div>
                <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"18px" }}>
                  <BigLabel hint="HR, EAP, or other support services — no names">Referrals & Collaboration</BigLabel>
                  <BigTextarea value={form.referrals} onChange={v=>set("referrals",v)} placeholder="Interactions with HR, EAP, or other support services — referrals made (no names)..." rows={4} />
                </div>
                <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"18px" }}>
                  <BigLabel hint="What sustained you, what was challenging">Personal Reflection</BigLabel>
                  <BigTextarea value={form.personalReflection} onChange={v=>set("personalReflection",v)} placeholder="Your own experience this period — what sustained you, what was challenging or stretching..." rows={4} />
                </div>
              </div>

              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"22px" }}>
                <SectionTitle>Site Assessment</SectionTitle>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
                  <div>
                    <BigLabel hint="1 low → 5 high">Site Wellbeing</BigLabel>
                    <BigSelect value={form.siteWellbeing} onChange={v=>set("siteWellbeing",v)} placeholder="Select..."
                      options={["1 — Critical concern","2 — Struggling","3 — Stable","4 — Doing well","5 — Thriving"]} />
                  </div>
                  <div>
                    <BigLabel>Availability Next Period</BigLabel>
                    <BigSelect value={form.availabilityNext} onChange={v=>set("availabilityNext",v)} placeholder="Select..."
                      options={["Full availability","Reduced availability","Unavailable — coverage needed"]} />
                  </div>
                  <div>
                    <BigLabel>Incidents to Flag?</BigLabel>
                    <div style={{ display:"flex",gap:8,marginTop:2 }}>
                      {[["No",false],["Yes",true]].map(([lbl,val])=>(
                        <button key={lbl} onClick={()=>set("flagIncident",val)}
                          style={{ flex:1,padding:"12px",borderRadius:10,border:`2px solid ${form.flagIncident===val?(val?"#c0392b":accentGreen):borderCol}`,background:form.flagIncident===val?(val?"#fdedec":"#eafaf1"):"#fff",color:form.flagIncident===val?(val?"#922b21":"#1e8449"):textColor,fontSize:14,fontWeight:700,cursor:"pointer",transition:"all 0.15s" }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo upload */}
              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"18px",marginTop:12 }}>
                <SectionTitle>Photos (Optional)</SectionTitle>
                <div onClick={()=>fileRef.current?.click()} style={{ padding:"20px",borderRadius:10,border:`2px dashed ${borderCol}`,cursor:"pointer",textAlign:"center",transition:"border-color 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=cc} onMouseLeave={e=>e.currentTarget.style.borderColor=borderCol}>
                  <div style={{ fontSize:24,marginBottom:6 }}>📷</div>
                  <div style={{ fontSize:13,color:labelColor }}>Tap to attach photos from your visit</div>
                  <input ref={fileRef} type="file" multiple accept="image/*" style={{ display:"none" }} onChange={e=>setPhotoNames(Array.from(e.target.files).map(f=>f.name))} />
                </div>
                {photoNames.length > 0 && (
                  <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginTop:10 }}>
                    {photoNames.map((n,i)=>(
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:6,background:"#eafaf1",borderRadius:8,padding:"5px 10px",fontSize:12,color:"#1e8449" }}>🖼️ {n}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 4: ISSUES ── */}
          {step === 4 && (
            <div style={{ padding:"24px" }}>
              <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"22px",marginBottom:16 }}>
                <SectionTitle>Log an Issue or Concern</SectionTitle>
                <div style={{ fontSize:13,color:labelColor,marginBottom:18,lineHeight:1.6 }}>
                  Use this section to flag anything that needs attention — access problems, scheduling conflicts, safety concerns, or anything unusual.
                </div>
                <div style={{ marginBottom:14 }}>
                  <BigLabel>Category</BigLabel>
                  <BigSelect value={issueForm.category} onChange={v=>setIssueForm(p=>({...p,category:v}))} placeholder="What kind of issue?"
                    options={ERROR_CATEGORIES} />
                </div>
                <div style={{ marginBottom:14 }}>
                  <BigLabel>How Serious Is It?</BigLabel>
                  <div style={{ display:"flex",gap:10 }}>
                    {["low","medium","high"].map(s => {
                      const sv = SEVERITY[s];
                      const sel = issueForm.severity === s;
                      return (
                        <button key={s} onClick={()=>setIssueForm(p=>({...p,severity:s}))}
                          style={{ flex:1,padding:"14px 10px",borderRadius:12,border:`2px solid ${sel?sv.text:borderCol}`,background:sel?sv.bg:"#fff",color:sel?sv.text:labelColor,fontSize:14,fontWeight:sel?700:500,cursor:"pointer",textTransform:"capitalize",transition:"all 0.15s" }}>
                          {s==="low"?"🟢":s==="medium"?"🟡":"🔴"} {sv.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <BigLabel required hint="What happened? When? Who was involved (no names needed)?">Description</BigLabel>
                  <BigTextarea value={issueForm.description} onChange={v=>setIssueForm(p=>({...p,description:v}))}
                    placeholder="Describe what happened, when it occurred, and what you observed..." rows={3} />
                </div>
                <div style={{ marginBottom:16 }}>
                  <BigLabel hint="What did you do about it?">Steps Taken</BigLabel>
                  <BigTextarea value={issueForm.resolution} onChange={v=>setIssueForm(p=>({...p,resolution:v}))}
                    placeholder="Any steps you took to address or handle the situation..." rows={2} />
                </div>
                <label style={{ display:"flex",alignItems:"center",gap:10,fontSize:14,color:textColor,cursor:"pointer",marginBottom:16,padding:"12px 14px",borderRadius:10,background:"#fef9e7",border:`1px solid #f0d98a` }}>
                  <input type="checkbox" checked={issueForm.reportToVP} onChange={e=>setIssueForm(p=>({...p,reportToVP:e.target.checked}))} style={{ accentColor:"#c0392b",width:18,height:18 }} />
                  <div>
                    <div style={{ fontWeight:700,color:"#7a4f00" }}>Flag for supervisor review</div>
                    <div style={{ fontSize:12,color:"#9a6e00",marginTop:1 }}>This will be flagged for {user.vpName || "your supervisor"}</div>
                  </div>
                </label>
                <button onClick={addIssue} disabled={!issueForm.category||!issueForm.description}
                  style={{ width:"100%",padding:"13px",borderRadius:12,border:"none",background:issueForm.category&&issueForm.description?cc:"#d0dae6",color:"#fff",fontSize:15,fontWeight:700,cursor:issueForm.category&&issueForm.description?"pointer":"default",transition:"background 0.15s" }}>
                  + Add This Issue
                </button>
              </div>

              {issues.length > 0 && (
                <div style={{ background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,padding:"22px" }}>
                  <SectionTitle>Logged Issues ({issues.length})</SectionTitle>
                  {issues.map(issue => {
                    const sv = SEVERITY[issue.severity];
                    return (
                      <div key={issue.id} style={{ borderRadius:10,overflow:"hidden",border:`1.5px solid ${sv.text}44`,marginBottom:10 }}>
                        <div style={{ padding:"10px 14px",background:sv.bg,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <span>{issue.severity==="high"?"🔴":issue.severity==="medium"?"🟡":"🟢"}</span>
                            <span style={{ fontSize:13,fontWeight:700,color:sv.text }}>{issue.category}</span>
                            {issue.reportToVP && <span style={{ fontSize:11,background:"#fdedec",color:"#922b21",padding:"2px 8px",borderRadius:10,fontWeight:600 }}>Flagged</span>}
                          </div>
                          <button onClick={()=>setIssues(p=>p.filter(i=>i.id!==issue.id))} style={{ border:"none",background:"transparent",color:"#9aa8b8",cursor:"pointer",fontSize:14 }}>✕</button>
                        </div>
                        <div style={{ padding:"12px 14px",background:"#fff" }}>
                          <div style={{ fontSize:13,color:textColor,lineHeight:1.6,marginBottom:issue.resolution?6:0 }}>{issue.description}</div>
                          {issue.resolution && <div style={{ fontSize:12,color:labelColor,fontStyle:"italic" }}>→ {issue.resolution}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {issues.length === 0 && (
                <div style={{ textAlign:"center",padding:"32px 20px",background:cardBg,borderRadius:14,border:`1px solid ${borderCol}`,color:labelColor }}>
                  <div style={{ fontSize:36,marginBottom:10 }}>✅</div>
                  <div style={{ fontSize:15,fontWeight:600,color:textColor,marginBottom:4 }}>No issues to report</div>
                  <div style={{ fontSize:13 }}>If everything went smoothly, you can skip this step and submit your visit.</div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Footer nav */}
      {!submitted && (
        <div style={{ padding:"16px 24px",borderTop:`1px solid ${borderCol}`,background:cardBg,display:"flex",gap:10,flexShrink:0,alignItems:"center" }}>
          {step > 1 && (
            <button onClick={()=>setStep(s=>s-1)}
              style={{ padding:"12px 20px",borderRadius:12,border:`1.5px solid ${borderCol}`,background:"transparent",color:labelColor,fontSize:14,fontWeight:600,cursor:"pointer" }}>
              ← Back
            </button>
          )}
          <div style={{ flex:1 }} />
          {step < 4 ? (
            <button onClick={()=>{ if(canAdvance()) setStep(s=>s+1); }}
              style={{ padding:"13px 28px",borderRadius:12,border:"none",background:canAdvance()?cc:"#d0dae6",color:"#fff",fontSize:15,fontWeight:700,cursor:canAdvance()?"pointer":"default",transition:"background 0.15s",minWidth:140 }}>
              Continue →
            </button>
          ) : (
            <button onClick={()=>setSubmitted(true)}
              style={{ padding:"13px 28px",borderRadius:12,border:"none",background:accentGreen,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",minWidth:180 }}>
              ✓ Save Visit{issues.length>0?` + ${issues.length} Issue${issues.length>1?"s":""}`:""}
            </button>
          )}
        </div>
      )}
    </Drawer>
  );
}




// ── Client Detail Drawer ──────────────────────────────────────────────────────
function ClientDrawer({ client, user, onClose, onBuildReport, onTimeExpense, onVisit }) {
  if (!client) return null;
  const cc = client.color;
  const h = HEALTH[client.health];
  const days = daysUntil(client.nextDue);

  return (
    <Drawer onClose={onClose}>
      <div style={{ background:`linear-gradient(135deg,${cc},${cc}dd)`,padding:"28px 28px 24px",color:"#fff",flexShrink:0 }}>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:52,height:52,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,border:"2px solid rgba(255,255,255,0.35)",flexShrink:0 }}>{client.logo}</div>
            <div>
              <div style={{ fontSize:20,fontWeight:700,fontFamily:"'Georgia',serif" }}>{client.name}</div>
              <div style={{ fontSize:13,opacity:0.8,marginTop:2 }}>{client.industry} · {client.employees.toLocaleString()} employees</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border:"none",background:"rgba(255,255,255,0.2)",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ display:"flex",gap:10,marginTop:18 }}>
          {[["CHAPLAINS",client.chaplains],["ENGAGEMENT",`${client.engagementScore}%`],["STATUS",client.healthLabel]].map(([l,v],i)=>(
            <div key={i} style={{ background:i===2&&client.health==="red"?"rgba(231,76,60,0.3)":i===2&&client.health==="yellow"?"rgba(243,156,18,0.25)":"rgba(255,255,255,0.15)",borderRadius:8,padding:"8px 14px",fontSize:13 }}>
              <div style={{ opacity:0.75,fontSize:11,marginBottom:2 }}>{l}</div>
              <div style={{ fontWeight:700 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"24px 28px",flex:1,display:"flex",flexDirection:"column",gap:20,overflow:"auto" }}>
        {/* Quick Actions */}
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10 }}>Quick Actions</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8 }}>
            {[["✏️","Build ECR Report",onBuildReport],["⏱️","Log Time & Expense",onTimeExpense],["📍","Log Site Visit",onVisit]].map(([icon,label,fn],i)=>(
              <button key={i} onClick={fn} style={{ padding:"12px 8px",borderRadius:10,border:`1.5px solid ${cc}22`,background:`${cc}08`,color:cc,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center",lineHeight:1.5,transition:"all 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${cc}18`;e.currentTarget.style.borderColor=cc}} onMouseLeave={e=>{e.currentTarget.style.background=`${cc}08`;e.currentTarget.style.borderColor=`${cc}22`}}>
                <div style={{ fontSize:18,marginBottom:4 }}>{icon}</div>{label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Contact */}
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8 }}>Key Contact</div>
          <div style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px",display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:40,height:40,borderRadius:"50%",background:cc+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:cc,flexShrink:0 }}>{client.contact.split(" ").map(n=>n[0]).join("")}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14,fontWeight:700,color:"#1a2a3a" }}>{client.contact}</div>
              <div style={{ fontSize:12,color:"#6b7a8d" }}>{client.contactTitle}</div>
              <div style={{ fontSize:12,color:cc,marginTop:2 }}>{client.contactEmail}</div>
            </div>
            <a href={`mailto:${client.contactEmail}`} style={{ padding:"7px 14px",borderRadius:7,background:cc,color:"#fff",fontSize:12,fontWeight:600,textDecoration:"none" }}>Email</a>
          </div>
        </div>

        {/* Report Timeline */}
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8 }}>Report Timeline</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <div style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px" }}>
              <div style={{ fontSize:11,color:"#9aa8b8",fontWeight:700,textTransform:"uppercase",marginBottom:6 }}>Last Report</div>
              <div style={{ fontSize:15,fontWeight:700,color:"#1a2a3a" }}>{formatDate(client.lastReport)}</div>
            </div>
            <div style={{ background:days<0?"#fdedec":days<14?"#fef9e7":"#f7f9fc",borderRadius:10,padding:"14px 16px",border:days<0?`1.5px solid #e74c3c33`:days<14?`1.5px solid #f39c1233`:"none" }}>
              <div style={{ fontSize:11,color:"#9aa8b8",fontWeight:700,textTransform:"uppercase",marginBottom:6 }}>Next Due</div>
              <div style={{ fontSize:15,fontWeight:700,color:days<0?"#922b21":days<14?"#9a6e00":"#1a2a3a" }}>{formatDate(client.nextDue)}</div>
              <div style={{ fontSize:11,color:days<0?"#e74c3c":days<14?"#f39c12":"#9aa8b8",marginTop:3 }}>{days<0?`${Math.abs(days)} days overdue`:days===0?"Due today":`In ${days} days`}</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8 }}>Recent Activity</div>
          <div style={{ background:`${cc}0d`,borderLeft:`3px solid ${cc}`,borderRadius:"0 8px 8px 0",padding:"12px 16px",fontSize:13,color:"#2c3e50",lineHeight:1.7 }}>{client.recentActivity}</div>
        </div>

        {/* Visit Trend */}
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8 }}>Chaplain Visit Trend</div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={client.chaplainVisits} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
              <XAxis dataKey="month" tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ borderRadius:8,border:"1px solid #e0e6ef",fontSize:12 }} />
              <Bar dataKey="v" name="Visits" fill={cc} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Drawer>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
// ── Chaplain Dashboard Data ───────────────────────────────────────────────────
function buildChaplainData(clients) {
  // Flatten all chaplains across clients with mock per-chaplain stats
  const seed = (name) => { let h=0; for(let c of name) h=(h*31+c.charCodeAt(0))&0xffffffff; return Math.abs(h); };
  return clients.flatMap(client =>
    (client.chaplainNames||[]).map((name, i) => {
      const s = seed(name);
      const visits      = 80 + (s % 120);
      const onTime      = Math.round(visits * (0.72 + (s % 20)/100));
      const late        = visits - onTime;
      const crisisCount = 2 + (s % 8);
      const score       = 60 + (s % 38);
      const trend       = ["up","stable","down"][s % 3];
      return {
        name, client: client.name, clientColor: client.color, clientLogo: client.logo,
        visits, onTime, late, crisisCount, score, trend,
        onTimePct: Math.round((onTime/visits)*100),
        specializedCare: 4 + (s % 14),
        followUps: Math.round(visits * 0.28),
        avgDaysToSubmit: (1 + (s % 4)).toFixed(1),
        months: ["Aug","Sep","Oct","Nov","Dec","Jan"].map((m,mi) => ({
          month:m, visits: Math.round(visits/6 * (0.8 + ((s+mi)%5)*0.08))
        })),
      };
    })
  );
}

// ── Chaplain Dashboard ────────────────────────────────────────────────────────
function ChaplainDashboard({ clients, onBack }) {
  const [tab, setTab]   = useState("overview");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("visits");
  const [drillChaplain, setDrillChaplain] = useState(null);
  const cc = "#1a4a7a";

  const chaplains = buildChaplainData(clients);
  const filtered  = chaplains.filter(ch =>
    ch.name.toLowerCase().includes(search.toLowerCase()) ||
    ch.client.toLowerCase().includes(search.toLowerCase())
  );
  const sorted = [...filtered].sort((a,b) => b[sortBy] - a[sortBy]);

  const totalVisits    = chaplains.reduce((s,c)=>s+c.visits,0);
  const totalOnTime    = chaplains.reduce((s,c)=>s+c.onTime,0);
  const totalLate      = chaplains.reduce((s,c)=>s+c.late,0);
  const totalCrisis    = chaplains.reduce((s,c)=>s+c.crisisCount,0);
  const totalSpecialized = chaplains.reduce((s,c)=>s+c.specializedCare,0);
  const avgScore       = Math.round(chaplains.reduce((s,c)=>s+c.score,0)/chaplains.length);
  const onTimePct      = Math.round((totalOnTime/(totalOnTime+totalLate))*100);

  const TABS = [
    { key:"overview",    label:"Overview"          },
    { key:"engagements", label:"Engagements"       },
    { key:"specialized", label:"Specialized Care"  },
    { key:"crisis",      label:"Crisis Events"     },
    { key:"teams",       label:"Chaplain Teams"    },
    { key:"timeliness",  label:"Timeliness"        },
  ];

  // Drill modal
  const DrillModal = drillChaplain ? (() => {
    const ch = drillChaplain;
    return (
      <div onClick={()=>setDrillChaplain(null)} style={{ position:"fixed",inset:0,background:"rgba(10,20,40,0.55)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(3px)" }}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:660,maxHeight:"88vh",overflow:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.22)" }}>
          <div style={{ background:`linear-gradient(135deg,${ch.clientColor},${ch.clientColor}cc)`,padding:"20px 24px",color:"#fff",borderRadius:"16px 16px 0 0" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,border:"2px solid rgba(255,255,255,0.4)" }}>
                  {ch.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div style={{ fontSize:18,fontWeight:700,fontFamily:"'Georgia',serif" }}>{ch.name}</div>
                  <div style={{ fontSize:12,opacity:0.8,marginTop:2 }}>{ch.client}</div>
                </div>
              </div>
              <button onClick={()=>setDrillChaplain(null)} style={{ border:"none",background:"rgba(255,255,255,0.2)",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            </div>
          </div>
          <div style={{ padding:"20px 24px 28px",display:"flex",flexDirection:"column",gap:20 }}>
            {/* KPI row */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10 }}>
              {[["Visits",ch.visits,cc],["On-Time",`${ch.onTimePct}%`,"#27ae60"],["Crisis",ch.crisisCount,"#8e44ad"],["Score",`${ch.score}%`,ch.score>=75?"#27ae60":ch.score>=60?"#f39c12":"#e74c3c"]].map(([l,v,c],i)=>(
                <div key={i} style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${c}`,textAlign:"center" }}>
                  <div style={{ fontSize:22,fontWeight:700,color:c,fontFamily:"'Georgia',serif" }}>{v}</div>
                  <div style={{ fontSize:11,color:"#6b7a8d",marginTop:3 }}>{l}</div>
                </div>
              ))}
            </div>
            {/* Visit trend */}
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:"#6b7a8d",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10 }}>6-Month Visit Trend</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={ch.months} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                  <XAxis dataKey="month" tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ borderRadius:8,fontSize:12 }} />
                  <Bar dataKey="visits" name="Visits" fill={ch.clientColor} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Details */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              {[["Follow-ups",ch.followUps],["Specialized Care",ch.specializedCare],["Avg Days to Submit",ch.avgDaysToSubmit],["Trend",ch.trend==="up"?"↑ Improving":ch.trend==="down"?"↓ Declining":"→ Stable"]].map(([l,v],i)=>(
                <div key={i} style={{ background:"#f7f9fc",borderRadius:8,padding:"12px 14px" }}>
                  <div style={{ fontSize:11,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:15,fontWeight:700,color:"#1a2a3a" }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Timeliness bar */}
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7a8d",marginBottom:6 }}>
                <span style={{ fontWeight:700,color:"#1a2a3a" }}>Timeliness</span>
                <span>{ch.onTimePct}% on-time · {ch.late} late</span>
              </div>
              <div style={{ background:"#f0f4f8",borderRadius:6,height:12,overflow:"hidden" }}>
                <div style={{ height:"100%",background:`linear-gradient(90deg,#27ae60 ${ch.onTimePct}%,#e74c3c ${ch.onTimePct}%)`,borderRadius:6 }} />
              </div>
              <div style={{ fontSize:11,color:"#9aa8b8",marginTop:4 }}>Reports submitted within 3 days of activity date are On-Time</div>
            </div>
          </div>
        </div>
      </div>
    );
  })() : null;

  // Shared search/sort bar
  const SearchBar = (
    <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:20 }}>
      <div style={{ position:"relative",flex:1,maxWidth:280 }}>
        <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#9aa8b8" }}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chaplains or clients..."
          style={{ width:"100%",padding:"8px 10px 8px 30px",borderRadius:8,border:"1px solid #d0dae6",fontSize:13,color:"#1a2a3a",background:"#fff",outline:"none",boxSizing:"border-box" }} />
      </div>
      <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
        style={{ fontSize:13,border:"1px solid #d0dae6",borderRadius:7,padding:"7px 10px",color:"#1a2a3a",background:"#fff",cursor:"pointer" }}>
        <option value="visits">Sort: Visits</option>
        <option value="onTimePct">Sort: On-Time %</option>
        <option value="score">Sort: Score</option>
        <option value="crisisCount">Sort: Crisis</option>
      </select>
      <div style={{ marginLeft:"auto",fontSize:12,color:"#9aa8b8" }}>{sorted.length} chaplains</div>
    </div>
  );

  const ChaplainRow = ({ ch }) => (
    <div onClick={()=>setDrillChaplain(ch)}
      style={{ display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 1fr 80px",gap:12,alignItems:"center",padding:"12px 16px",borderRadius:10,border:"1px solid #e8edf2",marginBottom:8,cursor:"pointer",background:"#fff",transition:"all 0.12s" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=ch.clientColor;e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.08)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="#e8edf2";e.currentTarget.style.boxShadow="none"}}>
      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
        <div style={{ width:32,height:32,borderRadius:"50%",background:ch.clientColor+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:ch.clientColor,flexShrink:0 }}>
          {ch.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
        </div>
        <div>
          <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a" }}>{ch.name}</div>
          <div style={{ fontSize:11,color:"#9aa8b8" }}>{ch.client}</div>
        </div>
      </div>
      <div style={{ fontSize:12,color:"#6b7a8d" }}>
        <div style={{ width:6,height:6,borderRadius:"50%",background:ch.clientColor,display:"inline-block",marginRight:5 }} />
        {ch.client}
      </div>
      <div style={{ fontSize:14,fontWeight:700,color:cc }}>{ch.visits}</div>
      <div>
        <div style={{ fontSize:13,fontWeight:700,color:ch.onTimePct>=85?"#27ae60":ch.onTimePct>=70?"#f39c12":"#e74c3c" }}>{ch.onTimePct}%</div>
      </div>
      <div style={{ fontSize:13,fontWeight:700,color:"#8e44ad" }}>{ch.crisisCount}</div>
      <div>
        <div style={{ fontSize:13,fontWeight:700,color:ch.score>=75?"#27ae60":ch.score>=60?"#f39c12":"#e74c3c" }}>{ch.score}%</div>
      </div>
      <div style={{ fontSize:11,color:ch.trend==="up"?"#27ae60":ch.trend==="down"?"#e74c3c":"#9aa8b8",fontWeight:700 }}>
        {ch.trend==="up"?"↑ Up":ch.trend==="down"?"↓ Down":"→"}
      </div>
    </div>
  );

  const TableHeader = () => (
    <div style={{ display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 1fr 80px",gap:12,padding:"8px 16px",marginBottom:4 }}>
      {["Chaplain","Client","Visits","On-Time","Crisis","Score","Trend"].map(h=>(
        <div key={h} style={{ fontSize:11,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.07em" }}>{h}</div>
      ))}
    </div>
  );

  const SummaryKpis = ({ items }) => (
    <div style={{ display:"grid",gridTemplateColumns:`repeat(${items.length},1fr)`,gap:12,marginBottom:24 }}>
      {items.map(([l,v,c,sub],i)=>(
        <div key={i} style={{ background:"#fff",borderRadius:12,padding:"18px 18px",border:"1px solid #e0e6ef",borderTop:`3px solid ${c}` }}>
          <div style={{ fontSize:28,fontWeight:700,color:c,fontFamily:"'Georgia',serif" }}>{v}</div>
          <div style={{ fontSize:13,color:"#1a2a3a",fontWeight:600,marginTop:4 }}>{l}</div>
          {sub && <div style={{ fontSize:11,color:"#9aa8b8",marginTop:2 }}>{sub}</div>}
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>
      {DrillModal}

      {/* Sub-header */}
      <div style={{ background:"#fff",borderBottom:"1px solid #e0e6ef",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52 }}>
        <div style={{ display:"flex",alignItems:"center",gap:14 }}>
          <button onClick={onBack} style={{ border:"none",background:"transparent",cursor:"pointer",fontSize:13,color:"#6b7a8d",display:"flex",alignItems:"center",gap:6,padding:"4px 0" }}>← Dashboard</button>
          <div style={{ width:1,height:20,background:"#e0e6ef" }} />
          <div style={{ fontSize:15,fontWeight:700,color:"#1a2a3a" }}>Chaplain Performance Dashboard</div>
          <div style={{ fontSize:12,color:"#9aa8b8" }}>· {chaplains.length} chaplains across {clients.length} clients</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:"#fff",borderBottom:"1px solid #e0e6ef",padding:"0 28px",display:"flex",gap:4 }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ padding:"12px 16px",border:"none",background:"transparent",fontSize:13,fontWeight:tab===t.key?700:400,color:tab===t.key?cc:"#6b7a8d",borderBottom:tab===t.key?`2px solid ${cc}`:"2px solid transparent",cursor:"pointer",marginBottom:-1,transition:"color 0.15s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:1200,margin:"0 auto",padding:"28px 20px" }}>

        {/* ── OVERVIEW ── */}
        {tab==="overview" && (
          <>
            <SummaryKpis items={[
              ["Total Chaplains", chaplains.length, cc, `Across ${clients.length} clients`],
              ["Total Visits", totalVisits.toLocaleString(), cc, "Aug 2024 – Jan 2025"],
              ["Avg Engagement Score", `${avgScore}%`, avgScore>=75?"#27ae60":avgScore>=60?"#f39c12":"#e74c3c", "Portfolio average"],
              ["Overall On-Time Rate", `${onTimePct}%`, onTimePct>=85?"#27ae60":onTimePct>=70?"#f39c12":"#e74c3c", "Reports within 3 days"],
              ["Crisis Interventions", totalCrisis, "#8e44ad", "Period total"],
            ]} />
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24 }}>
              {/* Score distribution */}
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"20px" }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:4 }}>Performance Score Distribution</div>
                <div style={{ fontSize:12,color:"#9aa8b8",marginBottom:16 }}>All {chaplains.length} chaplains</div>
                {[["High (75–100%)", chaplains.filter(c=>c.score>=75).length, "#27ae60"],
                  ["Mid  (60–74%)",  chaplains.filter(c=>c.score>=60&&c.score<75).length, "#f39c12"],
                  ["Low  (<60%)",    chaplains.filter(c=>c.score<60).length, "#e74c3c"]].map(([l,v,c],i)=>(
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                    <div style={{ fontSize:12,color:"#6b7a8d",width:110 }}>{l}</div>
                    <div style={{ flex:1,background:"#f0f4f8",borderRadius:4,height:10,overflow:"hidden" }}>
                      <div style={{ height:"100%",background:c,borderRadius:4,width:`${(v/chaplains.length)*100}%`,transition:"width 0.4s" }} />
                    </div>
                    <div style={{ fontSize:13,fontWeight:700,color:c,width:24,textAlign:"right" }}>{v}</div>
                  </div>
                ))}
              </div>
              {/* Visits by client */}
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"20px" }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:4 }}>Visits by Client</div>
                <div style={{ fontSize:12,color:"#9aa8b8",marginBottom:16 }}>Total chaplain visits per account</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={clients.map(c=>({ name:c.name.length>14?c.name.slice(0,14)+"…":c.name, visits:c.chaplainVisits.reduce((s,v)=>s+v.v,0), color:c.color }))} barSize={20} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius:8,fontSize:12 }} />
                    <Bar dataKey="visits" name="Visits" radius={[0,4,4,0]}>
                      {clients.map((c,i)=><Cell key={i} fill={c.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {SearchBar}
            <TableHeader />
            {sorted.map(ch=><ChaplainRow key={ch.name+ch.client} ch={ch} />)}
          </>
        )}

        {/* ── ENGAGEMENTS ── */}
        {tab==="engagements" && (
          <>
            <SummaryKpis items={[
              ["Total Visits", totalVisits.toLocaleString(), cc],
              ["Avg Visits / Chaplain", Math.round(totalVisits/chaplains.length), cc],
              ["Follow-Up Rate", `${Math.round(chaplains.reduce((s,c)=>s+c.followUps,0)/totalVisits*100)}%`, "#27ae60"],
              ["Most Active", chaplains.reduce((a,b)=>b.visits>a.visits?b:a).name.split(" ").slice(-1)[0], cc],
            ]} />
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"20px",marginBottom:24 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:16 }}>Monthly Visit Trend — Portfolio</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={["Aug","Sep","Oct","Nov","Dec","Jan"].map((m,mi)=>({
                  month:m,
                  visits: chaplains.reduce((s,c)=>s+(c.months[mi]?.visits||0),0)
                }))}>
                  <defs>
                    <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cc} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={cc} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                  <XAxis dataKey="month" tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:12,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius:8,fontSize:13 }} />
                  <Area type="monotone" dataKey="visits" name="Total Visits" stroke={cc} strokeWidth={2.5} fill="url(#aGrad)" dot={{ fill:cc,r:4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {SearchBar}
            <TableHeader />
            {[...sorted].sort((a,b)=>b.visits-a.visits).map(ch=><ChaplainRow key={ch.name+ch.client} ch={ch} />)}
          </>
        )}

        {/* ── SPECIALIZED CARE ── */}
        {tab==="specialized" && (
          <>
            <SummaryKpis items={[
              ["Specialized Care Events", totalSpecialized, "#8e44ad"],
              ["Avg per Chaplain", (totalSpecialized/chaplains.length).toFixed(1), "#8e44ad"],
              ["Highest Volume", chaplains.reduce((a,b)=>b.specializedCare>a.specializedCare?b:a).name.split(" ").slice(-1)[0], "#8e44ad"],
            ]} />
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"20px",marginBottom:24 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:16 }}>Specialized Care by Chaplain</div>
              {[...sorted].sort((a,b)=>b.specializedCare-a.specializedCare).map((ch,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
                  <div style={{ width:140,fontSize:12,color:"#1a2a3a",fontWeight:600,lineHeight:1.3 }}>{ch.name}</div>
                  <div style={{ flex:1,background:"#f0f4f8",borderRadius:4,height:14,overflow:"hidden",cursor:"pointer" }} onClick={()=>setDrillChaplain(ch)}>
                    <div style={{ height:"100%",background:"#8e44ad",borderRadius:4,width:`${(ch.specializedCare/totalSpecialized)*100*2}%`,maxWidth:"100%",transition:"width 0.4s" }} />
                  </div>
                  <div style={{ fontSize:13,fontWeight:700,color:"#8e44ad",width:24,textAlign:"right" }}>{ch.specializedCare}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── CRISIS EVENTS ── */}
        {tab==="crisis" && (
          <>
            <SummaryKpis items={[
              ["Crisis Interventions", totalCrisis, "#e74c3c"],
              ["Avg per Chaplain", (totalCrisis/chaplains.length).toFixed(1), "#e74c3c"],
              ["Highest Responder", chaplains.reduce((a,b)=>b.crisisCount>a.crisisCount?b:a).name.split(" ").slice(-1)[0], "#e74c3c"],
              ["Referral Rate", "100%", "#27ae60", "All cases referred"],
            ]} />
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24 }}>
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"20px" }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:16 }}>Crisis Load by Chaplain</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[...chaplains].sort((a,b)=>b.crisisCount-a.crisisCount).slice(0,8).map(c=>({ name:c.name.split(" ").slice(-1)[0], count:c.crisisCount, color:c.clientColor }))} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                    <XAxis dataKey="name" tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius:8,fontSize:12 }} />
                    <Bar dataKey="count" name="Crisis Events" radius={[4,4,0,0]}>
                      {[...chaplains].sort((a,b)=>b.crisisCount-a.crisisCount).slice(0,8).map((c,i)=><Cell key={i} fill={c.clientColor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"20px" }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:16 }}>Crisis by Client Account</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={clients.map(c=>({ name:c.name, value:buildChaplainData([c]).reduce((s,ch)=>s+ch.crisisCount,0), color:c.color }))}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                      label={({name,percent})=>`${name.split(" ")[0]} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {clients.map((c,i)=><Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={v=>[v,"Cases"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {SearchBar}
            <TableHeader />
            {[...sorted].sort((a,b)=>b.crisisCount-a.crisisCount).map(ch=><ChaplainRow key={ch.name+ch.client} ch={ch} />)}
          </>
        )}

        {/* ── CHAPLAIN TEAMS ── */}
        {tab==="teams" && (
          <>
            <SummaryKpis items={[
              ["Total Chaplains", chaplains.length, cc],
              ["Clients Covered", clients.length, cc],
              ["Avg Team Size", (chaplains.length/clients.length).toFixed(1), cc],
              ["Largest Team", clients.reduce((a,b)=>b.chaplains>a.chaplains?b:a).name.split(" ")[0], cc],
            ]} />
            {clients.map(client=>{
              const teamChaplains = chaplains.filter(ch=>ch.client===client.name);
              const teamAvgScore = Math.round(teamChaplains.reduce((s,c)=>s+c.score,0)/teamChaplains.length);
              return (
                <div key={client.id} style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",overflow:"hidden",marginBottom:16 }}>
                  <div style={{ background:`linear-gradient(90deg,${client.color}18,transparent)`,padding:"14px 20px",borderBottom:"1px solid #e8edf2",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <div style={{ width:32,height:32,borderRadius:8,background:client.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:client.color }}>{client.logo}</div>
                      <div>
                        <div style={{ fontSize:14,fontWeight:700,color:"#1a2a3a" }}>{client.name}</div>
                        <div style={{ fontSize:11,color:"#9aa8b8" }}>{client.industry} · {teamChaplains.length} chaplain{teamChaplains.length!==1?"s":""}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex",gap:12 }}>
                      {[["Avg Score",`${teamAvgScore}%`,teamAvgScore>=75?"#27ae60":teamAvgScore>=60?"#f39c12":"#e74c3c"],
                        ["Total Visits",teamChaplains.reduce((s,c)=>s+c.visits,0),client.color]].map(([l,v,c],i)=>(
                        <div key={i} style={{ textAlign:"center" }}>
                          <div style={{ fontSize:16,fontWeight:700,color:c }}>{v}</div>
                          <div style={{ fontSize:10,color:"#9aa8b8" }}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding:"12px 20px",display:"flex",flexWrap:"wrap",gap:8 }}>
                    {teamChaplains.map((ch,i)=>(
                      <div key={i} onClick={()=>setDrillChaplain(ch)}
                        style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,border:"1px solid #e8edf2",cursor:"pointer",transition:"all 0.12s",background:"#fafbfd" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=client.color;e.currentTarget.style.background=client.color+"0a"}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="#e8edf2";e.currentTarget.style.background="#fafbfd"}}>
                        <div style={{ width:28,height:28,borderRadius:"50%",background:client.color+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:client.color }}>
                          {ch.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <div style={{ fontSize:12,fontWeight:700,color:"#1a2a3a" }}>{ch.name}</div>
                          <div style={{ fontSize:10,color:ch.score>=75?"#27ae60":ch.score>=60?"#f39c12":"#e74c3c",fontWeight:600 }}>{ch.score}% score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── TIMELINESS ── */}
        {tab==="timeliness" && (
          <>
            <SummaryKpis items={[
              ["On-Time Submissions", `${onTimePct}%`, onTimePct>=85?"#27ae60":onTimePct>=70?"#f39c12":"#e74c3c", "≤3 days from activity"],
              ["Late Submissions", totalLate, "#e74c3c", "Submitted after 3 days"],
              ["On-Time Count", totalOnTime, "#27ae60"],
              ["Avg Days to Submit", (chaplains.reduce((s,c)=>s+parseFloat(c.avgDaysToSubmit),0)/chaplains.length).toFixed(1), cc, "Portfolio average"],
            ]} />
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"20px",marginBottom:24 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:4 }}>Timeliness by Chaplain</div>
              <div style={{ fontSize:12,color:"#9aa8b8",marginBottom:16 }}>Green = on-time · Red = late · Reports ≤ 3 days = on-time</div>
              {[...chaplains].sort((a,b)=>b.onTimePct-a.onTimePct).map((ch,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:9,cursor:"pointer" }} onClick={()=>setDrillChaplain(ch)}>
                  <div style={{ width:150,flexShrink:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:"#1a2a3a",lineHeight:1.2 }}>{ch.name}</div>
                    <div style={{ fontSize:10,color:"#9aa8b8" }}>{ch.client}</div>
                  </div>
                  <div style={{ flex:1,background:"#f0f4f8",borderRadius:5,height:12,overflow:"hidden",position:"relative" }}>
                    <div style={{ position:"absolute",left:0,top:0,height:"100%",background:"#27ae60",borderRadius:"5px 0 0 5px",width:`${ch.onTimePct}%`,transition:"width 0.4s" }} />
                    <div style={{ position:"absolute",left:`${ch.onTimePct}%`,top:0,height:"100%",background:"#e74c3c",borderRadius:"0 5px 5px 0",width:`${100-ch.onTimePct}%` }} />
                  </div>
                  <div style={{ fontSize:12,fontWeight:700,color:ch.onTimePct>=85?"#27ae60":ch.onTimePct>=70?"#f39c12":"#e74c3c",width:36,textAlign:"right" }}>{ch.onTimePct}%</div>
                  <div style={{ fontSize:11,color:"#9aa8b8",width:50,textAlign:"right" }}>{ch.avgDaysToSubmit}d avg</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"20px" }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:16 }}>Timeliness by Client Account</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={clients.map(c=>{ const team=chaplains.filter(ch=>ch.client===c.name); const ot=team.reduce((s,ch)=>s+ch.onTime,0); const tot=team.reduce((s,ch)=>s+ch.visits,0); return { name:c.name.length>12?c.name.slice(0,12)+"…":c.name, onTime:Math.round(ot/tot*100), late:100-Math.round(ot/tot*100), color:c.color }; })} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                  <XAxis dataKey="name" tick={{ fontSize:10,fill:"#6b7a8d" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:11,fill:"#6b7a8d" }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ borderRadius:8,fontSize:12 }} formatter={v=>[`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize:12 }} />
                  <Bar dataKey="onTime" name="On-Time %" stackId="a" fill="#27ae60" radius={[0,0,0,0]} />
                  <Bar dataKey="late"   name="Late %"    stackId="a" fill="#e74c3c" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

      </div>
    </div>
  );
}


function StatsDrillModal({ stat, clients, color, onClose }) {
  if (!stat) return null;
  const cc = color;

  const onTrack  = clients.filter(c=>c.health==="green");
  const dueSoon  = clients.filter(c=>c.health==="yellow");
  const overdue  = clients.filter(c=>c.health==="red");

  let content = null;

  if (stat === "Assigned Clients") {
    const byIndustry = clients.reduce((acc,c)=>{ acc[c.industry]=(acc[c.industry]||0)+1; return acc; },{});
    const industryData = Object.entries(byIndustry).map(([k,v])=>({ name:k, count:v })).sort((a,b)=>b.count-a.count);
    content = (
      <>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24 }}>
          {[["Total Clients",clients.length,cc],["On Track",onTrack.length,"#27ae60"],["Need Attention",dueSoon.length+overdue.length,"#e74c3c"]].map(([l,v,c],i)=>(
            <div key={i} style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${c}` }}>
              <div style={{ fontSize:24,fontWeight:700,color:c,fontFamily:"'Georgia',serif" }}>{v}</div>
              <div style={{ fontSize:12,color:"#6b7a8d",marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:10 }}>By Industry</div>
        {industryData.map((d,i)=>(
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
            <div style={{ fontSize:12,color:"#6b7a8d",width:140,flexShrink:0 }}>{d.name}</div>
            <div style={{ flex:1,background:"#f0f4f8",borderRadius:4,height:10,overflow:"hidden" }}>
              <div style={{ height:"100%",background:cc,borderRadius:4,width:`${(d.count/clients.length)*100}%`,transition:"width 0.4s" }} />
            </div>
            <div style={{ fontSize:12,fontWeight:700,color:cc,width:20,textAlign:"right" }}>{d.count}</div>
          </div>
        ))}
        <div style={{ marginTop:20,fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:10 }}>All Clients</div>
        {clients.map(c=>(
          <div key={c.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderRadius:8,border:"1px solid #e8edf2",marginBottom:6,background:"#fafbfd" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:7,background:c.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:c.color }}>{c.logo}</div>
              <div>
                <div style={{ fontSize:13,fontWeight:600,color:"#1a2a3a" }}>{c.name}</div>
                <div style={{ fontSize:11,color:"#9aa8b8" }}>{c.industry} · {c.employees.toLocaleString()} employees</div>
              </div>
            </div>
            <div style={{ fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:12,background:HEALTH[c.health].bg,color:HEALTH[c.health].text }}>{c.healthLabel}</div>
          </div>
        ))}
      </>
    );
  }

  else if (stat === "Active Chaplains") {
    const sorted = [...clients].sort((a,b)=>b.chaplains-a.chaplains);
    const total = clients.reduce((a,c)=>a+c.chaplains,0);
    const avgPerClient = (total/clients.length).toFixed(1);
    const allChaplainNames = clients.flatMap(c=>c.chaplainNames||[]);
    content = (
      <>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24 }}>
          {[["Total Chaplains",total,cc],["Avg per Client",avgPerClient,cc],["Total Clients Covered",clients.length,cc]].map(([l,v,c],i)=>(
            <div key={i} style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${c}` }}>
              <div style={{ fontSize:24,fontWeight:700,color:c,fontFamily:"'Georgia',serif" }}>{v}</div>
              <div style={{ fontSize:12,color:"#6b7a8d",marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:10 }}>Chaplains by Client</div>
        {sorted.map(c=>(
          <div key={c.id} style={{ marginBottom:12,padding:"12px 14px",borderRadius:8,border:"1px solid #e8edf2",background:"#fafbfd" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a" }}>{c.name}</div>
              <div style={{ fontSize:12,fontWeight:700,color:cc }}>{c.chaplains} chaplains</div>
            </div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {(c.chaplainNames||[]).map((n,i)=>(
                <div key={i} style={{ fontSize:11,padding:"3px 9px",borderRadius:12,background:cc+"15",color:cc,fontWeight:600 }}>{n}</div>
              ))}
            </div>
          </div>
        ))}
      </>
    );
  }

  else if (stat === "Avg Engagement") {
    const sorted = [...clients].sort((a,b)=>b.engagementScore-a.engagementScore);
    const avg = Math.round(clients.reduce((a,c)=>a+c.engagementScore,0)/clients.length);
    const high = clients.filter(c=>c.engagementScore>=75).length;
    const low  = clients.filter(c=>c.engagementScore<60).length;
    content = (
      <>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24 }}>
          {[["Portfolio Avg",`${avg}%`,cc],["High Engagement (≥75%)",high,"#27ae60"],["Low Engagement (<60%)",low,"#e74c3c"]].map(([l,v,c],i)=>(
            <div key={i} style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${c}` }}>
              <div style={{ fontSize:24,fontWeight:700,color:c,fontFamily:"'Georgia',serif" }}>{v}</div>
              <div style={{ fontSize:12,color:"#6b7a8d",marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:12 }}>Engagement Score by Client</div>
        {sorted.map(c=>{
          const pct = c.engagementScore;
          const barColor = pct>=75?"#27ae60":pct>=60?"#f39c12":"#e74c3c";
          return (
            <div key={c.id} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
              <div style={{ width:150,flexShrink:0 }}>
                <div style={{ fontSize:12,fontWeight:600,color:"#1a2a3a",lineHeight:1.2 }}>{c.name}</div>
                <div style={{ fontSize:11,color:"#9aa8b8" }}>{c.trend==="up"?"↑ Trending up":c.trend==="down"?"↓ Trending down":"→ Stable"}</div>
              </div>
              <div style={{ flex:1,background:"#f0f4f8",borderRadius:5,height:12,overflow:"hidden" }}>
                <div style={{ height:"100%",background:barColor,borderRadius:5,width:`${pct}%`,transition:"width 0.4s" }} />
              </div>
              <div style={{ fontSize:13,fontWeight:700,color:barColor,width:36,textAlign:"right" }}>{pct}%</div>
            </div>
          );
        })}
      </>
    );
  }

  else if (stat === "On Track" || stat === "Due Soon" || stat === "Overdue") {
    const map = { "On Track":onTrack, "Due Soon":dueSoon, "Overdue":overdue };
    const statusColor = { "On Track":"#27ae60", "Due Soon":"#f39c12", "Overdue":"#e74c3c" };
    const sc = statusColor[stat];
    const list = map[stat];
    const others = clients.filter(c=>!list.includes(c));
    content = (
      <>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24 }}>
          {[["On Track",onTrack.length,"#27ae60"],["Due Soon",dueSoon.length,"#f39c12"],["Overdue",overdue.length,"#e74c3c"]].map(([l,v,c],i)=>(
            <div key={i} style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${c}`,opacity:l===stat?1:0.45 }}>
              <div style={{ fontSize:24,fontWeight:700,color:c,fontFamily:"'Georgia',serif" }}>{v}</div>
              <div style={{ fontSize:12,color:"#6b7a8d",marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
        {list.length === 0
          ? <div style={{ textAlign:"center",padding:"32px 0",color:"#9aa8b8",fontSize:14 }}>No clients in this status 🎉</div>
          : list.map(c=>{
              const days = daysUntil(c.nextDue);
              return (
                <div key={c.id} style={{ padding:"14px 16px",borderRadius:10,border:`1.5px solid ${sc}33`,background:sc+"08",marginBottom:10 }}>
                  <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <div style={{ width:32,height:32,borderRadius:8,background:c.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:c.color }}>{c.logo}</div>
                      <div>
                        <div style={{ fontSize:14,fontWeight:700,color:"#1a2a3a" }}>{c.name}</div>
                        <div style={{ fontSize:11,color:"#9aa8b8" }}>{c.industry} · {c.contact}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:12,fontWeight:700,color:sc }}>{stat==="Overdue"?`${Math.abs(days)}d overdue`:stat==="Due Soon"?`Due in ${days}d`:"Report current"}</div>
                      <div style={{ fontSize:11,color:"#9aa8b8",marginTop:2 }}>Next due: {formatDate(c.nextDue)}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8 }}>
                    <div style={{ fontSize:11,padding:"3px 8px",borderRadius:8,background:"#f0f4f8",color:"#6b7a8d" }}>Engagement: {c.engagementScore}%</div>
                    <div style={{ fontSize:11,padding:"3px 8px",borderRadius:8,background:"#f0f4f8",color:"#6b7a8d" }}>{c.chaplains} chaplain{c.chaplains!==1?"s":""}</div>
                    <div style={{ fontSize:11,padding:"3px 8px",borderRadius:8,background:"#f0f4f8",color:"#6b7a8d",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📋 {c.recentActivity}</div>
                  </div>
                </div>
              );
            })
        }
      </>
    );
  }

  const titles = {
    "Assigned Clients": "Assigned Clients",
    "Active Chaplains": "Active Chaplains",
    "Avg Engagement":   "Engagement Scores",
    "On Track":         "On Track Clients",
    "Due Soon":         "Reports Due Soon",
    "Overdue":          "Overdue Reports",
  };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(10,20,40,0.55)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(3px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:660,maxHeight:"85vh",overflow:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.22)" }}>
        <div style={{ padding:"20px 24px 16px",borderBottom:"1px solid #e8edf2",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#fff",zIndex:10 }}>
          <div>
            <div style={{ fontSize:11,fontWeight:700,color:cc,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3 }}>Dashboard · Drill-Down</div>
            <div style={{ fontSize:20,fontWeight:700,color:"#1a2a3a",fontFamily:"'Georgia',serif" }}>{titles[stat]}</div>
          </div>
          <button onClick={onClose} style={{ border:"none",background:"#f0f4f8",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#6b7a8d",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:"20px 24px 28px" }}>
          {content}
        </div>
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ clients, color, onChaplains }) {
  const [activeStat, setActiveStat] = useState(null);
  const stats = [
    { label:"Assigned Clients", value:clients.length,                                                                    icon:"🏢" },
    { label:"Active Chaplains", value:clients.reduce((a,c)=>a+c.chaplains,0),                                            icon:"🤝" },
    { label:"Avg Engagement",   value:`${Math.round(clients.reduce((a,c)=>a+c.engagementScore,0)/clients.length)}%`,     icon:"📊" },
    { label:"On Track",         value:clients.filter(c=>c.health==="green").length,  icon:"✅", color:"#27ae60" },
    { label:"Due Soon",         value:clients.filter(c=>c.health==="yellow").length, icon:"⏰", color:"#f39c12" },
    { label:"Overdue",          value:clients.filter(c=>c.health==="red").length,    icon:"🔴", color:"#e74c3c" },
  ];
  const handleClick = (label) => {
    if (label === "Active Chaplains" && onChaplains) { onChaplains(); return; }
    setActiveStat(label);
  };
  return (
    <>
      <StatsDrillModal stat={activeStat} clients={clients} color={color} onClose={()=>setActiveStat(null)} />
      <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:24 }}>
        {stats.map((s,i)=>(
          <div key={i} onClick={()=>handleClick(s.label)}
            style={{ background:"#fff",borderRadius:10,padding:"14px 16px",border:"1px solid #e0e6ef",borderTop:`3px solid ${s.color||color}`,cursor:"pointer",transition:"all 0.15s",position:"relative" }}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,0.10)";e.currentTarget.style.transform="translateY(-2px)"}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none"}}>
            <div style={{ fontSize:18,marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:22,fontWeight:700,color:s.color||color,fontFamily:"'Georgia',serif" }}>{s.value}</div>
            <div style={{ fontSize:11,color:"#9aa8b8",marginTop:2 }}>{s.label}</div>
            <div style={{ fontSize:9,color:"#b0bcc8",marginTop:4,letterSpacing:"0.03em" }}>{s.label==="Active Chaplains"?"View dashboard →":"Click to drill in →"}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({ client, onClick }) {
  const cc = client.color;
  const h = HEALTH[client.health];
  const days = daysUntil(client.nextDue);
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:"#fff",borderRadius:12,border:`1.5px solid ${hov?cc:"#e0e6ef"}`,cursor:"pointer",overflow:"hidden",transition:"all 0.15s",boxShadow:hov?"0 6px 24px rgba(0,0,0,0.10)":"0 1px 4px rgba(0,0,0,0.05)",transform:hov?"translateY(-2px)":"none" }}>
      <div style={{ height:5,background:`linear-gradient(90deg,${cc},${cc}88)` }} />
      <div style={{ padding:"18px 18px 14px" }}>
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:42,height:42,borderRadius:10,background:cc+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:cc,flexShrink:0 }}>{client.logo}</div>
            <div>
              <div style={{ fontSize:15,fontWeight:700,color:"#1a2a3a",lineHeight:1.3 }}>{client.name}</div>
              <div style={{ fontSize:12,color:"#6b7a8d",marginTop:2 }}>{client.industry}</div>
            </div>
          </div>
          <div style={{ background:h.bg,color:h.text,fontSize:11,fontWeight:700,padding:"4px 9px",borderRadius:20,display:"flex",alignItems:"center",gap:5,flexShrink:0 }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:h.dot }} />{client.healthLabel}
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14 }}>
          {[["Employees",client.employees.toLocaleString()],["Chaplains",client.chaplains],["Engagement",`${client.engagementScore}%`]].map(([l,v],i)=>(
            <div key={i} style={{ background:"#f7f9fc",borderRadius:8,padding:"8px 10px",textAlign:"center" }}>
              <div style={{ fontSize:15,fontWeight:700,color:cc }}>{v}</div>
              <div style={{ fontSize:10,color:"#9aa8b8",marginTop:1 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12,fontSize:12,color:"#6b7a8d" }}>
          <span>👤</span><span><strong style={{ color:"#1a2a3a" }}>{client.contact}</strong> · {client.contactTitle}</span>
        </div>
        <div style={{ marginBottom:12 }}>
          <ResponsiveContainer width="100%" height={44}>
            <BarChart data={client.chaplainVisits} barSize={7} margin={{ top:0,right:0,bottom:0,left:0 }}>
              <Bar dataKey="v" radius={[2,2,0,0]}>
                {client.chaplainVisits.map((_,i)=><Cell key={i} fill={i===client.chaplainVisits.length-1?cc:cc+"55"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid #f0f4f8" }}>
          <div style={{ fontSize:11,color:"#9aa8b8" }}>Last report: <strong style={{ color:"#6b7a8d" }}>{formatDate(client.lastReport)}</strong></div>
          <div style={{ fontSize:11,fontWeight:700,color:days<0?"#e74c3c":days<14?"#f39c12":cc }}>{days<0?`${Math.abs(days)}d overdue`:days===0?"Due today":`Due in ${days}d`}</div>
        </div>
      </div>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, lang, setLang }) {
  const lx = LANG[lang] || LANG.en;
  const ROLE_ORDER = ["EDO","VP","Exec","Chaplain"];
  const roleLabel = { EDO:lx.roleEDO, VP:lx.roleVP, Exec:lx.roleExec, Chaplain:lx.roleChaplain };

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#0f2441 0%,#1a4a7a 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Helvetica Neue',Arial,sans-serif",padding:"24px" }}>
      <div style={{ background:"#fff",borderRadius:20,padding:"44px 44px 36px",width:"100%",maxWidth:460,textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }}>

        <div style={{ width:64,height:64,borderRadius:16,background:"#1a4a7a",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:22,fontWeight:700,color:"#fff" }}>MM</div>
        <h1 style={{ fontSize:24,fontWeight:700,color:"#1a2a3a",margin:"0 0 6px",fontFamily:"'Georgia',serif" }}>Marketplace Ministries</h1>
        <p style={{ fontSize:14,color:"#6b7a8d",margin:"0 0 20px" }}>ECR Report Builder · EDO Portal</p>

        {/* Language switcher */}
        <div style={{ display:"flex",justifyContent:"center",gap:6,marginBottom:24 }}>
          {["en","es","fr"].map(l => (
            <button key={l} onClick={()=>setLang(l)}
              style={{ padding:"5px 14px",borderRadius:6,border:"1.5px solid",borderColor:lang===l?"#1a4a7a":"#d0dae6",background:lang===l?"#1a4a7a":"#fff",color:lang===l?"#fff":"#6b7a8d",fontSize:12,fontWeight:lang===l?700:400,cursor:"pointer",transition:"all 0.15s" }}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Users grouped by role */}
        <div style={{ borderTop:"1px solid #e8edf2",paddingTop:24,marginBottom:20,textAlign:"left" }}>
          <p style={{ fontSize:12,color:"#9aa8b8",marginBottom:16,textAlign:"center" }}>{lx.signIn}</p>
          {ROLE_ORDER.map(role => {
            const users = ALL_USERS.filter(u => u.role === role);
            if (!users.length) return null;
            return (
              <div key={role} style={{ marginBottom:18 }}>
                <div style={{ fontSize:10,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8,paddingLeft:2 }}>
                  {roleLabel[role]}
                </div>
                {users.map(u => (
                  <button key={u.id} onClick={()=>onLogin(u)}
                    style={{ width:"100%",display:"flex",alignItems:"center",gap:14,padding:"11px 14px",borderRadius:10,border:"1.5px solid #e0e6ef",background:"#fff",cursor:"pointer",marginBottom:7,textAlign:"left",transition:"all 0.15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#1a4a7a";e.currentTarget.style.boxShadow="0 2px 12px rgba(26,74,122,0.12)"}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#e0e6ef";e.currentTarget.style.boxShadow="none"}}>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:"#1a4a7a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0 }}>{u.avatar}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a" }}>{u.name}</div>
                      <div style={{ fontSize:11,color:"#6b7a8d",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.region} · {u.title}</div>
                    </div>
                    <div style={{ marginLeft:"auto",fontSize:12,color:"#9aa8b8",flexShrink:0 }}>→</div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex",alignItems:"center",gap:8,justifyContent:"center",fontSize:12,color:"#9aa8b8" }}>
          <span>🔒</span> {lx.secured}
        </div>
      </div>
    </div>
  );
}


// ── Mock Visit Log Data ───────────────────────────────────────────────────────
function makeMockVisits(allClients) {
  const logs = [];
  const chaplainsByClient = {};
  allClients.forEach(c => { chaplainsByClient[c.id] = c.chaplainNames || []; });

  const overviews = [
    "A warm and receptive atmosphere on the floor today. Chaplain presence was well-received. Several employees sought out one-on-one time unprompted, which is a positive sign for program trust.",
    "Heavier emotional climate this visit — several conversations touched on anxiety around upcoming organizational changes. Chaplain team responded with steady, grounded presence.",
    "Strong visit overall. Team morale appeared higher than last quarter. Engagement at lunch areas was particularly rich with informal connections.",
    "Notable uptick in grief-related conversations, likely connected to a loss in the community last week. Pastoral care was the primary focus.",
    "Productive visit with good chaplain visibility. Multiple employees flagged interest in a group session next quarter.",
    "Exceptional engagement today. Employees were eager to connect and the chaplain was able to offer meaningful support across multiple departments.",
    "A quieter visit — many employees were heads-down on a production push. Chaplain focused on brief, intentional check-ins rather than longer conversations.",
    "Crisis follow-up was the primary focus today. The chaplain provided ongoing support to individuals affected by last week's incident.",
    "New employees were especially receptive. Several first-time conversations laid a strong foundation for ongoing chaplain relationships.",
    "Holiday season is clearly affecting morale. Chaplain noted increased loneliness and financial stress themes across multiple conversations.",
  ];
  const themesList = [
    "Workplace anxiety, particularly around restructuring announcements. Financial stress surfacing in multiple conversations.",
    "Family transitions — several employees navigating eldercare or new parenthood. Grief from a community loss rippling through the site.",
    "Burnout themes among mid-level supervisors. General morale strong on the production floor.",
    "Spiritual questions and meaning-of-work themes. Strong interest in faith-based support.",
    "Immigration concerns among a portion of the workforce. Chaplain providing presence and connecting families with resources.",
    "Post-holiday re-entry fatigue visible across shifts. Employees expressing gratitude for chaplain availability.",
    "Compensation frustrations are a recurring theme. Chaplain listening carefully and providing appropriate referrals.",
    "Strong community spirit observed. Team celebrated a colleague's milestone and chaplain was invited to participate.",
  ];
  const reflections = [
    "This was a meaningful visit. I felt genuinely present and sustained by the connections made. The challenge was pacing — so many needs, limited time.",
    "Stretched but not depleted. The heavier conversations reminded me why this work matters. Grateful for a strong chaplain team.",
    "I left feeling encouraged. The receptivity here continues to grow. Personal prayer and preparation beforehand made a difference.",
    "Difficult day emotionally — carried some of the weight home. Will debrief with supervisor and lean on team support.",
    "One of my best visits in months. The trust that has been built here over time is bearing real fruit.",
  ];

  const seed = (s) => { let h=0; for(let c of s) h=(h*31+c.charCodeAt(0))&0xffffffff; return Math.abs(h); };
  const pick = (arr, s) => arr[Math.abs(s) % arr.length];
  const TYPES = INTERACTION_TYPES.map(t=>t.key);

  let id = 1;

  // Full 12-month calendar: Aug 2024 – Jul 2025
  const months = [
    "2024-08","2024-09","2024-10","2024-11","2024-12",
    "2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07"
  ];

  // Days in each month (non-leap 2024/2025)
  const daysInMonth = {
    "2024-08":31,"2024-09":30,"2024-10":31,"2024-11":30,"2024-12":31,
    "2025-01":31,"2025-02":28,"2025-03":31,"2025-04":30,"2025-05":31,"2025-06":30,"2025-07":31
  };

  // Generate a realistic spread of visit days for a client in a month
  // Large clients (chaplains >= 5) get 8-12 visits/month
  // Medium clients (chaplains 3-4) get 5-8 visits/month
  // Small clients (chaplains 1-2) get 2-4 visits/month
  function getVisitDays(client, ym) {
    const totalDays = daysInMonth[ym];
    const base = seed(client.id + ym + "days");
    const chaps = client.chaplains || 1;
    const count = chaps >= 5 ? 8 + (base % 5)      // 8–12
                : chaps >= 3 ? 5 + (base % 4)       // 5–8
                :              2 + (base % 3);       // 2–4

    // Spread visits across the month avoiding weekends (approx) and clustering
    const days = new Set();
    let attempts = 0;
    while (days.size < count && attempts < 100) {
      const d = 1 + (seed(client.id + ym + attempts + "d") % totalDays);
      // Avoid day 1 (often admin) and last day; prefer M-F range simulation
      const dow = new Date(`${ym}-${String(d).padStart(2,"0")}T12:00`).getDay();
      if (dow !== 0 && dow !== 6 && d > 1 && d < totalDays) days.add(d);
      attempts++;
    }
    // If we didn't get enough, fill remaining without weekend filter
    while (days.size < count && attempts < 200) {
      const d = 1 + (seed(client.id + ym + attempts + "fill") % totalDays);
      if (d > 1 && d < totalDays) days.add(d);
      attempts++;
    }
    return Array.from(days).sort((a,b)=>a-b);
  }

  allClients.forEach(client => {
    const chaps = chaplainsByClient[client.id] || ["Chaplain"];
    months.forEach((ym) => {
      const visitDays = getVisitDays(client, ym);
      visitDays.forEach((day, vi) => {
        const dateStr = `${ym}-${String(day).padStart(2,"0")}`;
        const s = seed(client.id + dateStr + vi);

        // More chaplains present on larger visits
        const maxChaps = Math.min(chaps.length, client.chaplains >= 5 ? 3 : 2);
        const chaplainCount = 1 + (s % maxChaps);
        // Rotate which chaplains show up to create variety
        const startIdx = (s % chaps.length);
        const presentChaplains = [];
        for (let ci = 0; ci < chaplainCount; ci++) {
          presentChaplains.push(chaps[(startIdx + ci) % chaps.length]);
        }

        // Interaction types — more variety, higher counts for bigger sites
        const interactions = {};
        const typeCount = 4 + (s % 6);
        for (let ti = 0; ti < typeCount; ti++) {
          const k = TYPES[(s + ti * 7) % TYPES.length];
          const cnt = 1 + ((s + ti * 3) % (client.employees > 1000 ? 8 : client.employees > 500 ? 5 : 3));
          interactions[k] = (interactions[k] || 0) + cnt;
        }
        const total = Object.values(interactions).reduce((a,b)=>a+b,0);

        // Duration varies by client size and visit type
        const durPool = client.employees > 2000
          ? ["2–4 hours","4–6 hours","4–6 hours","Full day","Full day"]
          : client.employees > 800
          ? ["1–2 hours","2–4 hours","2–4 hours","4–6 hours","Full day"]
          : ["1–2 hours","1–2 hours","2–4 hours","2–4 hours","4–6 hours"];
        const duration = pick(durPool, s);

        const visitTypePool = ["Scheduled Visit","Scheduled Visit","Scheduled Visit","Follow-up Visit","Chaplain Check-in","Crisis Response"];
        const hasIssue = (s % 11 === 0); // ~9% have a flagged issue
        const followUpNeeded = (s % 5 === 0);

        logs.push({
          id: String(id++),
          date: dateStr,
          clientId: client.id,
          clientName: client.name,
          clientColor: client.color,
          clientLogo: client.logo,
          chaplains: presentChaplains,
          visitType: pick(visitTypePool, s),
          duration,
          totalEmployees: Math.round(client.employees * (0.03 + (s % 10) * 0.01)),
          interactions,
          totalInteractions: total,
          followUpNeeded,
          followUpNotes: followUpNeeded ? "Employee in difficult season — check in next visit. Referral to EAP being arranged." : "",
          periodOverview: pick(overviews, s),
          themes: pick(themesList, s),
          recommendations: "Continue regular presence. Consider group session offering next quarter. Follow up with HR contact on referral outcomes.",
          referrals: (s%4===0) ? "One referral made to EAP. Coordinated with HR on confidential basis." : "No formal referrals this period.",
          personalReflection: pick(reflections, s),
          siteWellbeing: String(3 + (s % 3)),
          availabilityNext: "Full availability",
          flagIncident: hasIssue,
          issues: hasIssue ? [{
            id:"i1",
            category: pick(ERROR_CATEGORIES, s+3),
            severity: pick(["low","medium","high"], s+1),
            description: pick([
              "Access to the east wing was restricted without prior notice, limiting chaplain rounds for approximately 45 minutes.",
              "A scheduling miscommunication resulted in the chaplain arriving during a mandatory all-hands meeting.",
              "An employee in distress required extended support — chaplain stayed two additional hours beyond scheduled visit.",
              "Safety concern reported by employee — chaplain documented and escalated to site coordinator per protocol.",
            ], s+5),
            resolution: "Coordinator contacted — issue resolved for future visits.",
            reportToVP: (s%3===0),
          }] : [],
          submittedDays: (s % 5),
          onTime: (s % 5) <= 3,
        });
      });
    });
  });

  return logs.sort((a,b) => b.date.localeCompare(a.date));
}

// Shared visit data (module-level so it persists across renders in demo)
let VISIT_LOG_SEED = null;
function getVisitLog(allClients) {
  if (!VISIT_LOG_SEED) VISIT_LOG_SEED = makeMockVisits(allClients);
  return VISIT_LOG_SEED;
}

// ── Visit Detail Modal ────────────────────────────────────────────────────────
function VisitDetailModal({ visit, onClose }) {
  const [tab, setTab] = useState("summary");
  if (!visit) return null;
  const cc = visit.clientColor;
  const totalInteractions = visit.totalInteractions;

  const TABS = [["summary","Summary"],["conversations","Conversations"],["narrative","Reflection"],["issues","Issues" + (visit.issues.length ? ` (${visit.issues.length})` : "")]];
  const SEVERITY = { low:{bg:"#eafaf1",text:"#1e8449"}, medium:{bg:"#fef9e7",text:"#9a6e00"}, high:{bg:"#fdedec",text:"#922b21"} };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(10,20,40,0.55)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:24,backdropFilter:"blur(3px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:680,maxHeight:"90vh",overflow:"hidden",boxShadow:"0 24px 64px rgba(0,0,0,0.22)",display:"flex",flexDirection:"column" }}>

        {/* Modal header */}
        <div style={{ background:`linear-gradient(135deg,${cc},${cc}dd)`,padding:"20px 24px",color:"#fff",flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:42,height:42,borderRadius:10,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,border:"2px solid rgba(255,255,255,0.35)" }}>{visit.clientLogo}</div>
              <div>
                <div style={{ fontSize:17,fontWeight:700,fontFamily:"'Georgia',serif" }}>{visit.clientName}</div>
                <div style={{ fontSize:12,opacity:0.85,marginTop:2 }}>
                  {formatDate(visit.date)} · {visit.visitType} · {visit.duration}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ border:"none",background:"rgba(255,255,255,0.2)",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          </div>
          {/* Quick stats row */}
          <div style={{ display:"flex",gap:8,marginTop:14 }}>
            {[[totalInteractions,"Conversations"],
              [visit.totalEmployees,"Employees"],
              [visit.chaplains.length,"Chaplain"+(visit.chaplains.length!==1?"s":"")],
              [visit.onTime?"On-Time":"Late","Submission"]
            ].map(([v,l],i)=>(
              <div key={i} style={{ background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"7px 12px",fontSize:12 }}>
                <span style={{ fontWeight:700 }}>{v}</span> <span style={{ opacity:0.8 }}>{l}</span>
              </div>
            ))}
            {visit.flagIncident && <div style={{ background:"rgba(231,76,60,0.4)",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700 }}>⚠️ Incident Flagged</div>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",borderBottom:"1px solid #e8edf2",padding:"0 24px",background:"#fafbfd",flexShrink:0 }}>
          {TABS.map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)}
              style={{ padding:"11px 16px",border:"none",background:"transparent",fontSize:13,fontWeight:tab===key?700:400,color:tab===key?cc:"#6b7a8d",borderBottom:tab===key?`2px solid ${cc}`:"2px solid transparent",cursor:"pointer",marginBottom:-1 }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex:1,overflow:"auto",padding:"20px 24px" }}>

          {tab === "summary" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[["Date",formatDate(visit.date)],["Visit Type",visit.visitType],["Duration",visit.duration],["Employees Engaged",visit.totalEmployees],["Chaplains Present",visit.chaplains.join(", ")],["Site Wellbeing",`${visit.siteWellbeing}/5`]].map(([l,v],i)=>(
                  <div key={i} style={{ background:"#f7f9fc",borderRadius:8,padding:"12px 14px" }}>
                    <div style={{ fontSize:11,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:14,fontWeight:600,color:"#1a2a3a" }}>{v}</div>
                  </div>
                ))}
              </div>
              {visit.followUpNeeded && (
                <div style={{ background:"#fef9e7",borderRadius:10,padding:"14px 16px",border:"1px solid #f0d98a" }}>
                  <div style={{ fontSize:12,fontWeight:700,color:"#7a4f00",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.07em" }}>⏰ Follow-up Required</div>
                  <div style={{ fontSize:13,color:"#2c2416",lineHeight:1.6 }}>{visit.followUpNotes}</div>
                </div>
              )}
              <div style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px" }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8 }}>Period Overview</div>
                <div style={{ fontSize:13,color:"#2c3e50",lineHeight:1.7 }}>{visit.periodOverview}</div>
              </div>
            </div>
          )}

          {tab === "conversations" && (
            <div>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
                <div style={{ fontSize:15,fontWeight:700,color:"#1a2a3a" }}>Interaction Breakdown</div>
                <div style={{ fontSize:20,fontWeight:700,color:cc,fontFamily:"'Georgia',serif" }}>{totalInteractions} total</div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
                {INTERACTION_TYPES.filter(t=>(visit.interactions[t.key]||0)>0).map(({ key, label, icon }) => (
                  <div key={key} style={{ background:"#f7f9fc",borderRadius:10,padding:"12px 14px",border:`1.5px solid ${cc}22`,display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ fontSize:20 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:13,fontWeight:600,color:"#1a2a3a" }}>{label}</div>
                      <div style={{ fontSize:20,fontWeight:700,color:cc,fontFamily:"'Georgia',serif" }}>{visit.interactions[key]}</div>
                    </div>
                  </div>
                ))}
              </div>
              {Object.keys(visit.interactions).length === 0 && (
                <div style={{ textAlign:"center",padding:"40px",color:"#9aa8b8" }}>No conversation types logged</div>
              )}
            </div>
          )}

          {tab === "narrative" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              {[["Period Overview",visit.periodOverview],["Themes & Pastoral Concerns",visit.themes],["Recommendations & Follow-up",visit.recommendations],["Referrals & Collaboration",visit.referrals],["Personal Reflection",visit.personalReflection]].map(([l,v],i)=>(
                v ? (
                  <div key={i} style={{ background:"#f7f9fc",borderRadius:10,padding:"14px 16px" }}>
                    <div style={{ fontSize:11,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8 }}>{l}</div>
                    <div style={{ fontSize:13,color:"#2c3e50",lineHeight:1.75 }}>{v}</div>
                  </div>
                ) : null
              ))}
            </div>
          )}

          {tab === "issues" && (
            visit.issues.length > 0 ? (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                {visit.issues.map(issue => {
                  const sv = SEVERITY[issue.severity] || SEVERITY.medium;
                  return (
                    <div key={issue.id} style={{ borderRadius:10,overflow:"hidden",border:`1.5px solid ${sv.text}44` }}>
                      <div style={{ padding:"10px 14px",background:sv.bg,display:"flex",alignItems:"center",gap:8 }}>
                        <span>{issue.severity==="high"?"🔴":issue.severity==="medium"?"🟡":"🟢"}</span>
                        <span style={{ fontSize:13,fontWeight:700,color:sv.text }}>{issue.category}</span>
                        <span style={{ fontSize:11,background:"rgba(0,0,0,0.07)",color:sv.text,padding:"2px 8px",borderRadius:10,textTransform:"capitalize" }}>{issue.severity}</span>
                        {issue.reportToVP && <span style={{ fontSize:11,background:"#fdedec",color:"#922b21",padding:"2px 8px",borderRadius:10,fontWeight:600,marginLeft:"auto" }}>Flagged for Supervisor</span>}
                      </div>
                      <div style={{ padding:"12px 14px",background:"#fff" }}>
                        <div style={{ fontSize:13,color:"#2c3e50",lineHeight:1.6,marginBottom:issue.resolution?8:0 }}>{issue.description}</div>
                        {issue.resolution && <div style={{ fontSize:12,color:"#6b7a8d",fontStyle:"italic" }}>→ {issue.resolution}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign:"center",padding:"48px 20px",color:"#9aa8b8" }}>
                <div style={{ fontSize:36,marginBottom:10 }}>✅</div>
                <div style={{ fontSize:15,fontWeight:600,color:"#6b7a8d" }}>No issues reported for this visit</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Visit Log Page ────────────────────────────────────────────────────────────
function VisitLogPage({ user, allClients, onBack }) {
  const cc = "#1a4a7a";
  const allVisits = getVisitLog(allClients);

  // Role-scoped filtering
  const myVisits = allVisits.filter(v => {
    if (user.role === "VP" || user.role === "Exec") return true;
    if (user.role === "Chaplain") {
      // Chaplain sees visits where their shortened name appears
      const shortName = user.name.replace("Rev. ","Rev. ").replace("Chap. ","Chap. ");
      return v.chaplains.some(c => c.includes(user.name.split(" ").slice(-1)[0]));
    }
    // EDO — see visits for their clients
    const myClientIds = allClients.map(c=>c.id);
    return myClientIds.includes(v.clientId);
  });

  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState("all");
  const [filterChaplain, setFilterChaplain] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterOnTime, setFilterOnTime] = useState("all");
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"

  const clientOptions = [...new Set(myVisits.map(v=>v.clientName))].sort();
  const chaplainOptions = [...new Set(myVisits.flatMap(v=>v.chaplains))].sort();
  const monthOptions = [...new Set(myVisits.map(v=>v.date.slice(0,7)))].sort().reverse();

  const filtered = myVisits.filter(v => {
    if (filterClient !== "all" && v.clientName !== filterClient) return false;
    if (filterChaplain !== "all" && !v.chaplains.includes(filterChaplain)) return false;
    if (filterMonth !== "all" && !v.date.startsWith(filterMonth)) return false;
    if (filterOnTime === "ontime" && !v.onTime) return false;
    if (filterOnTime === "late" && v.onTime) return false;
    if (search) {
      const q = search.toLowerCase();
      return v.clientName.toLowerCase().includes(q) ||
             v.chaplains.some(c=>c.toLowerCase().includes(q)) ||
             v.visitType.toLowerCase().includes(q) ||
             v.periodOverview.toLowerCase().includes(q);
    }
    return true;
  });

  const totalConversations = filtered.reduce((s,v)=>s+v.totalInteractions,0);
  const totalEmployees = filtered.reduce((s,v)=>s+v.totalEmployees,0);
  const onTimeCount = filtered.filter(v=>v.onTime).length;
  const flaggedCount = filtered.filter(v=>v.flagIncident).length;

  const VisitCard = ({ visit }) => {
    const h = { green:{bg:"#eafaf1",text:"#1e8449",dot:"#27ae60"}, yellow:{bg:"#fef9e7",text:"#9a6e00",dot:"#f39c12"}, red:{bg:"#fdedec",text:"#922b21",dot:"#e74c3c"} };
    const timingStyle = visit.onTime ? h.green : h.red;
    const topTypes = Object.entries(visit.interactions).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return (
      <div onClick={()=>setSelectedVisit(visit)}
        style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",cursor:"pointer",overflow:"hidden",transition:"all 0.15s" }}
        onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.10)";e.currentTarget.style.borderColor=visit.clientColor}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor="#e0e6ef"}}>
        <div style={{ height:4,background:`linear-gradient(90deg,${visit.clientColor},${visit.clientColor}88)` }} />
        <div style={{ padding:"16px" }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:9 }}>
              <div style={{ width:34,height:34,borderRadius:8,background:visit.clientColor+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:visit.clientColor,flexShrink:0 }}>{visit.clientLogo}</div>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",lineHeight:1.2 }}>{visit.clientName}</div>
                <div style={{ fontSize:11,color:"#9aa8b8",marginTop:1 }}>{formatDate(visit.date)}</div>
              </div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
              <div style={{ fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:10,background:timingStyle.bg,color:timingStyle.text }}>{visit.onTime?"On-Time":"Late"}</div>
              {visit.flagIncident && <div style={{ fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,background:"#fdedec",color:"#922b21" }}>⚠️ Flagged</div>}
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10 }}>
            {[[visit.totalInteractions,"Conversations"],[visit.totalEmployees,"Employees"],[visit.chaplains.length,"Chaplain"+(visit.chaplains.length!==1?"s":"")]].map(([v,l],i)=>(
              <div key={i} style={{ background:"#f7f9fc",borderRadius:6,padding:"7px 8px",textAlign:"center" }}>
                <div style={{ fontSize:15,fontWeight:700,color:visit.clientColor }}>{v}</div>
                <div style={{ fontSize:10,color:"#9aa8b8",marginTop:1 }}>{l}</div>
              </div>
            ))}
          </div>
          {topTypes.length > 0 && (
            <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:8 }}>
              {topTypes.map(([k,count])=>{
                const t = INTERACTION_TYPES.find(t=>t.key===k);
                return t ? (
                  <div key={k} style={{ fontSize:11,padding:"3px 8px",borderRadius:8,background:"#f0f4f8",color:"#6b7a8d",display:"flex",alignItems:"center",gap:4 }}>
                    <span>{t.icon}</span>{t.label} <strong style={{ color:visit.clientColor }}>{count}</strong>
                  </div>
                ) : null;
              })}
            </div>
          )}
          <div style={{ fontSize:11,color:"#9aa8b8",lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>
            {visit.periodOverview}
          </div>
        </div>
      </div>
    );
  };

  const VisitRow = ({ visit }) => {
    const timingStyle = visit.onTime ? {bg:"#eafaf1",text:"#1e8449"} : {bg:"#fdedec",text:"#922b21"};
    return (
      <div onClick={()=>setSelectedVisit(visit)}
        style={{ display:"grid",gridTemplateColumns:"36px 1.6fr 1.2fr 0.8fr 80px 80px 80px 80px 40px",gap:12,alignItems:"center",padding:"12px 16px",borderRadius:10,border:"1px solid #e8edf2",marginBottom:6,cursor:"pointer",background:"#fff",transition:"all 0.12s" }}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=visit.clientColor;e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.07)"}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="#e8edf2";e.currentTarget.style.boxShadow="none"}}>
        <div style={{ width:32,height:32,borderRadius:7,background:visit.clientColor+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:visit.clientColor }}>{visit.clientLogo}</div>
        <div>
          <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a" }}>{visit.clientName}</div>
          <div style={{ fontSize:11,color:"#9aa8b8" }}>{visit.visitType}</div>
        </div>
        <div style={{ fontSize:12,color:"#6b7a8d" }}>{visit.chaplains.slice(0,2).join(", ")}{visit.chaplains.length>2?` +${visit.chaplains.length-2}`:""}</div>
        <div style={{ fontSize:12,color:"#6b7a8d" }}>{formatDate(visit.date)}</div>
        <div style={{ textAlign:"center",fontSize:14,fontWeight:700,color:cc }}>{visit.totalInteractions}</div>
        <div style={{ textAlign:"center",fontSize:14,fontWeight:700,color:"#6b7a8d" }}>{visit.totalEmployees}</div>
        <div style={{ textAlign:"center" }}>
          <span style={{ fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:10,background:timingStyle.bg,color:timingStyle.text }}>{visit.onTime?"✓ On-Time":"Late"}</span>
        </div>
        <div style={{ textAlign:"center" }}>
          {visit.flagIncident && <span style={{ fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:10,background:"#fdedec",color:"#922b21" }}>⚠️</span>}
        </div>
        <div style={{ fontSize:18,color:"#d0dae6",textAlign:"right" }}>›</div>
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>
      {selectedVisit && <VisitDetailModal visit={selectedVisit} onClose={()=>setSelectedVisit(null)} />}

      {/* Sub-header */}
      <div style={{ background:"#fff",borderBottom:"1px solid #e0e6ef",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52 }}>
        <div style={{ display:"flex",alignItems:"center",gap:14 }}>
          <button onClick={onBack} style={{ border:"none",background:"transparent",cursor:"pointer",fontSize:13,color:"#6b7a8d",display:"flex",alignItems:"center",gap:6 }}>← Dashboard</button>
          <div style={{ width:1,height:20,background:"#e0e6ef" }} />
          <div style={{ fontSize:15,fontWeight:700,color:"#1a2a3a" }}>Visit Log</div>
          <div style={{ fontSize:12,color:"#9aa8b8" }}>· {myVisits.length} visits on record</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          {["list","grid"].map(m=>(
            <button key={m} onClick={()=>setViewMode(m)}
              style={{ padding:"5px 10px",borderRadius:6,border:"1px solid",borderColor:viewMode===m?cc:"#e0e6ef",background:viewMode===m?cc:"transparent",color:viewMode===m?"#fff":"#6b7a8d",fontSize:12,cursor:"pointer" }}>
              {m==="list"?"☰ List":"⊞ Grid"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1200,margin:"0 auto",padding:"24px 20px" }}>

        {/* Summary KPI bar */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24 }}>
          {[
            ["Visits Shown",filtered.length,cc,"of "+myVisits.length+" total"],
            ["Total Conversations",totalConversations.toLocaleString(),cc,"across all visits"],
            ["On-Time Submissions",`${filtered.length?Math.round(onTimeCount/filtered.length*100):0}%`,onTimeCount/Math.max(filtered.length,1)>=0.85?"#27ae60":"#f39c12",`${onTimeCount} of ${filtered.length}`],
            ["Flagged Incidents",flaggedCount,flaggedCount>0?"#e74c3c":"#27ae60",flaggedCount>0?"Needs attention":"All clear"],
          ].map(([l,v,c,sub],i)=>(
            <div key={i} style={{ background:"#fff",borderRadius:12,padding:"16px 18px",border:"1px solid #e0e6ef",borderTop:`3px solid ${c}` }}>
              <div style={{ fontSize:26,fontWeight:700,color:c,fontFamily:"'Georgia',serif" }}>{v}</div>
              <div style={{ fontSize:13,fontWeight:600,color:"#1a2a3a",marginTop:3 }}>{l}</div>
              <div style={{ fontSize:11,color:"#9aa8b8",marginTop:2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",padding:"16px 18px",marginBottom:20,display:"flex",flexWrap:"wrap",gap:10,alignItems:"center" }}>
          <div style={{ position:"relative",flex:"1 1 220px",minWidth:180 }}>
            <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#9aa8b8" }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search visits, clients, chaplains..."
              style={{ width:"100%",padding:"8px 10px 8px 30px",borderRadius:8,border:"1px solid #d0dae6",fontSize:13,color:"#1a2a3a",background:"#f7f9fc",outline:"none",boxSizing:"border-box" }} />
          </div>
          {user.role !== "Chaplain" && (
            <select value={filterChaplain} onChange={e=>setFilterChaplain(e.target.value)}
              style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #d0dae6",fontSize:13,color:"#1a2a3a",background:"#f7f9fc",cursor:"pointer" }}>
              <option value="all">All Chaplains</option>
              {chaplainOptions.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {(user.role === "VP" || user.role === "Exec") && (
            <select value={filterClient} onChange={e=>setFilterClient(e.target.value)}
              style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #d0dae6",fontSize:13,color:"#1a2a3a",background:"#f7f9fc",cursor:"pointer" }}>
              <option value="all">All Clients</option>
              {clientOptions.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
            style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #d0dae6",fontSize:13,color:"#1a2a3a",background:"#f7f9fc",cursor:"pointer" }}>
            <option value="all">All Months</option>
            {monthOptions.map(m=><option key={m} value={m}>{new Date(m+"-15").toLocaleDateString("en-US",{month:"long",year:"numeric"})}</option>)}
          </select>
          <select value={filterOnTime} onChange={e=>setFilterOnTime(e.target.value)}
            style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #d0dae6",fontSize:13,color:"#1a2a3a",background:"#f7f9fc",cursor:"pointer" }}>
            <option value="all">All Submissions</option>
            <option value="ontime">On-Time Only</option>
            <option value="late">Late Only</option>
          </select>
          {(search||filterClient!=="all"||filterChaplain!=="all"||filterMonth!=="all"||filterOnTime!=="all") && (
            <button onClick={()=>{setSearch("");setFilterClient("all");setFilterChaplain("all");setFilterMonth("all");setFilterOnTime("all");}}
              style={{ padding:"8px 14px",borderRadius:8,border:"1px solid #e74c3c",background:"transparent",color:"#e74c3c",fontSize:12,fontWeight:600,cursor:"pointer" }}>
              Clear Filters
            </button>
          )}
          <div style={{ marginLeft:"auto",fontSize:12,color:"#9aa8b8" }}>
            <strong style={{ color:"#1a2a3a" }}>{filtered.length}</strong> visits
          </div>
        </div>

        {/* List view headers */}
        {viewMode === "list" && filtered.length > 0 && (
          <div style={{ display:"grid",gridTemplateColumns:"36px 1.6fr 1.2fr 0.8fr 80px 80px 80px 80px 40px",gap:12,padding:"6px 16px",marginBottom:4 }}>
            {["","Client","Chaplain(s)","Date","Conv.","Employees","Timing","Flags",""].map((h,i)=>(
              <div key={i} style={{ fontSize:10,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.07em",textAlign:i>=4&&i<=7?"center":"left" }}>{h}</div>
            ))}
          </div>
        )}

        {/* Results */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center",padding:"60px 20px",background:"#fff",borderRadius:12,border:"1px solid #e0e6ef",color:"#9aa8b8" }}>
            <div style={{ fontSize:36,marginBottom:12 }}>📋</div>
            <div style={{ fontSize:16,fontWeight:600,color:"#6b7a8d",marginBottom:6 }}>No visits match your filters</div>
            <div style={{ fontSize:13 }}>Try adjusting your search or clearing filters</div>
          </div>
        ) : viewMode === "list" ? (
          filtered.map(v => <VisitRow key={v.id} visit={v} />)
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>
            {filtered.map(v => <VisitCard key={v.id} visit={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── App Shell (shared nav for all pages) ─────────────────────────────────────
// ── Hours Calendar Page ───────────────────────────────────────────────────────
// Duration string → decimal hours
function parseDuration(dur) {
  if (!dur) return 2;
  if (dur === "Full day") return 8;
  if (dur === "4–6 hours") return 5;
  if (dur === "2–4 hours") return 3;
  if (dur === "1–2 hours") return 1.5;
  return 2;
}

function HoursCalendarPage({ user, allClients }) {
  const visits = getVisitLog(allClients);
  const today = new Date(2025, 0, 15); // Jan 15 2025 — center of our rich data range

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(null); // "YYYY-MM-DD"
  const [hoveredDay,  setHoveredDay]  = useState(null);
  const [drillVisit,  setDrillVisit]  = useState(null);
  const [viewMode,    setViewMode]    = useState("month"); // "month" | "week" | "year"
  const [clientFilter, setClientFilter] = useState("all");

  // Role-scoped visits
  const scopedVisits = visits.filter(v => {
    if (user.role === "Chaplain") return v.chaplains.includes(user.name);
    if (user.role === "EDO")      return allClients.filter(c=>c.id===v.clientId).some(c=>c.edoId===user.id||c.region===user.region);
    return true; // VP / Exec see all
  });

  const filteredVisits = clientFilter === "all" ? scopedVisits
    : scopedVisits.filter(v => v.clientId === clientFilter);

  // Build date → visits map
  const visitsByDate = {};
  filteredVisits.forEach(v => {
    if (!visitsByDate[v.date]) visitsByDate[v.date] = [];
    visitsByDate[v.date].push(v);
  });

  // Date → total hours
  const hoursByDate = {};
  Object.entries(visitsByDate).forEach(([date, vs]) => {
    hoursByDate[date] = vs.reduce((sum, v) => sum + parseDuration(v.duration), 0);
  });

  // Heat color based on hours (0=empty, 1-2=light, 3-5=medium, 6+=deep)
  function heatColor(hours) {
    if (!hours) return null;
    if (hours <= 2)  return { bg:"#dbeafe", text:"#1e40af", dot:"#3b82f6" };
    if (hours <= 4)  return { bg:"#bfdbfe", text:"#1d4ed8", dot:"#2563eb" };
    if (hours <= 6)  return { bg:"#93c5fd", text:"#1e3a8a", dot:"#1d4ed8" };
    if (hours <= 10) return { bg:"#3b82f6", text:"#fff",    dot:"#1d4ed8" };
    return               { bg:"#1a4a7a", text:"#fff",    dot:"#0f2441" };
  }

  // Calendar grid helpers
  const daysInMonth = (y, m) => new Date(y, m+1, 0).getDate();
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay(); // 0=Sun
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  // Stats for current month
  const monthKey = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}`;
  const monthVisits = filteredVisits.filter(v => v.date.startsWith(monthKey));
  const monthHours  = monthVisits.reduce((s,v) => s+parseDuration(v.duration), 0);
  const monthInteractions = monthVisits.reduce((s,v) => s+v.totalInteractions, 0);
  const monthChaplains = new Set(monthVisits.flatMap(v=>v.chaplains)).size;
  const activeDays = Object.keys(hoursByDate).filter(d=>d.startsWith(monthKey)).length;

  // Year-level data for mini sparkline
  const yearMonthData = Array.from({length:12}, (_,mi) => {
    const mk = `${viewYear}-${String(mi+1).padStart(2,"0")}`;
    const mvs = filteredVisits.filter(v=>v.date.startsWith(mk));
    return {
      month: MONTH_NAMES[mi].slice(0,3),
      hours: Math.round(mvs.reduce((s,v)=>s+parseDuration(v.duration),0)),
      visits: mvs.length,
    };
  });

  // Selected day data
  const selectedVisits = selectedDay ? (visitsByDate[selectedDay] || []) : [];
  const selectedHours  = selectedDay ? (hoursByDate[selectedDay] || 0) : 0;

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y=>y-1); setViewMonth(11); }
    else setViewMonth(m=>m-1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y=>y+1); setViewMonth(0); }
    else setViewMonth(m=>m+1);
    setSelectedDay(null);
  }

  const dim = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const calCells = [...Array(firstDay).fill(null), ...Array.from({length:dim},(_,i)=>i+1)];
  while (calCells.length % 7 !== 0) calCells.push(null);

  return (
    <div style={{ padding:"24px 28px", maxWidth:1200, margin:"0 auto" }}>

      {/* ── Page header ── */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
        <div>
          <h1 style={{ fontSize:24,fontWeight:700,color:"#1a2a3a",fontFamily:"'Georgia',serif",margin:0 }}>🕐 Hours & Activity Calendar</h1>
          <p style={{ fontSize:13,color:"#6b7a8d",marginTop:4 }}>Chaplain time logged across all client sites — click any day to drill into visit details.</p>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
          {/* Client filter */}
          <select value={clientFilter} onChange={e=>{setClientFilter(e.target.value);setSelectedDay(null);}}
            style={{ padding:"7px 12px",borderRadius:8,border:"1px solid #d0dae6",fontSize:12,color:"#1a2a3a",background:"#fff",cursor:"pointer" }}>
            <option value="all">All Clients</option>
            {allClients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20 }}>
        {[
          { icon:"⏱", label:"Hours This Month",        value:monthHours.toFixed(1),    sub:"chaplain hours logged",      col:"#1a4a7a" },
          { icon:"📋", label:"Visits This Month",       value:monthVisits.length,        sub:`across ${activeDays} active days`, col:"#0e6655" },
          { icon:"🤝", label:"Interactions",            value:monthInteractions,          sub:"total employee touchpoints", col:"#6d28d9" },
          { icon:"🧑‍⚕️", label:"Chaplains Active",       value:monthChaplains,             sub:"unique chaplains on-site",   col:"#b45309" },
        ].map((k,i)=>(
          <div key={i} style={{ background:"#fff",border:"1px solid #e8edf2",borderRadius:12,padding:"14px 16px",borderTop:`3px solid ${k.col}` }}>
            <div style={{ fontSize:20,marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:26,fontWeight:700,color:k.col,fontFamily:"'Georgia',serif",lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:11,fontWeight:700,color:"#1a2a3a",marginTop:5,textTransform:"uppercase",letterSpacing:"0.05em" }}>{k.label}</div>
            <div style={{ fontSize:10,color:"#9aa8b8",marginTop:2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"start" }}>

        {/* ── LEFT: Calendar ── */}
        <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e8edf2",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>

          {/* Calendar header */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #f0f4f8" }}>
            <button onClick={prevMonth} style={{ border:"none",background:"#f0f4f8",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:15,color:"#1a2a3a",display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18,fontWeight:700,color:"#1a2a3a",fontFamily:"'Georgia',serif" }}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
              <div style={{ fontSize:11,color:"#9aa8b8",marginTop:2 }}>{monthHours.toFixed(1)} hours · {monthVisits.length} visits this month</div>
            </div>
            <button onClick={nextMonth} style={{ border:"none",background:"#f0f4f8",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:15,color:"#1a2a3a",display:"flex",alignItems:"center",justifyContent:"center" }}>›</button>
          </div>

          {/* Day-of-week labels */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"8px 12px 4px" }}>
            {DAY_LABELS.map(d=>(
              <div key={d} style={{ textAlign:"center",fontSize:10,fontWeight:700,color:"#9aa8b8",textTransform:"uppercase",letterSpacing:"0.08em",padding:"4px 0" }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,padding:"4px 12px 16px" }}>
            {calCells.map((day, ci) => {
              if (!day) return <div key={`e${ci}`} />;
              const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayVisits = visitsByDate[dateStr] || [];
              const hours = hoursByDate[dateStr] || 0;
              const heat = heatColor(hours);
              const isSelected = selectedDay === dateStr;
              const isHovered  = hoveredDay === dateStr;
              const isToday = dateStr === "2025-01-15";
              const hasFlag = dayVisits.some(v=>v.flagIncident);

              return (
                <div key={dateStr}
                  onClick={()=>{ if(dayVisits.length) setSelectedDay(isSelected ? null : dateStr); }}
                  onMouseEnter={()=>setHoveredDay(dateStr)}
                  onMouseLeave={()=>setHoveredDay(null)}
                  style={{
                    borderRadius:10,
                    padding:"6px 4px 8px",
                    textAlign:"center",
                    cursor: dayVisits.length ? "pointer" : "default",
                    background: isSelected ? "#1a4a7a" : heat ? heat.bg : isHovered && dayVisits.length ? "#f0f4f8" : "transparent",
                    border: isSelected ? "2px solid #1a4a7a" : isToday ? "2px solid #f39c12" : "2px solid transparent",
                    transition:"all 0.12s",
                    transform: isHovered && dayVisits.length && !isSelected ? "scale(1.06)" : "scale(1)",
                    boxShadow: isSelected ? "0 4px 14px rgba(26,74,122,0.25)" : isHovered && dayVisits.length ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                    minHeight:64,
                    position:"relative",
                  }}>
                  {/* Date number */}
                  <div style={{ fontSize:12,fontWeight:isToday||dayVisits.length?700:400,color:isSelected?"#fff":isToday?"#f39c12":dayVisits.length?"#1a2a3a":"#b0bcc8",marginBottom:3 }}>{day}</div>

                  {/* Hours badge */}
                  {hours > 0 && (
                    <div style={{ fontSize:13,fontWeight:700,color:isSelected?"#fff":heat?.text,lineHeight:1 }}>{hours % 1 === 0 ? hours : hours.toFixed(1)}<span style={{ fontSize:9,opacity:0.75 }}>h</span></div>
                  )}

                  {/* Visit count dots */}
                  {dayVisits.length > 0 && (
                    <div style={{ display:"flex",justifyContent:"center",gap:2,marginTop:4,flexWrap:"wrap" }}>
                      {dayVisits.slice(0,4).map((v,i)=>(
                        <div key={i} style={{ width:6,height:6,borderRadius:"50%",background:isSelected?"rgba(255,255,255,0.7)":v.clientColor,opacity:0.9 }} title={v.clientName} />
                      ))}
                      {dayVisits.length > 4 && <div style={{ fontSize:8,color:isSelected?"rgba(255,255,255,0.7)":"#9aa8b8" }}>+{dayVisits.length-4}</div>}
                    </div>
                  )}

                  {/* Flag indicator */}
                  {hasFlag && (
                    <div style={{ position:"absolute",top:3,right:3,fontSize:9 }}>⚠️</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Heat legend */}
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 20px 14px",borderTop:"1px solid #f0f4f8",flexWrap:"wrap" }}>
            <span style={{ fontSize:10,color:"#9aa8b8",fontWeight:600 }}>Hours:</span>
            {[["none","#f0f4f8","0"],["#dbeafe","#dbeafe","1–2h"],["#bfdbfe","#bfdbfe","3–4h"],["#93c5fd","#93c5fd","5–6h"],["#3b82f6","#3b82f6","7–10h"],["#1a4a7a","#1a4a7a","10h+"]].map(([_,bg,label])=>(
              <div key={label} style={{ display:"flex",alignItems:"center",gap:3 }}>
                <div style={{ width:12,height:12,borderRadius:3,background:bg,border:"1px solid #e0e6ef" }} />
                <span style={{ fontSize:10,color:"#6b7a8d" }}>{label}</span>
              </div>
            ))}
            <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:4 }}>
              <div style={{ width:10,height:10,borderRadius:"50%",background:"#e74c3c" }} />
              <span style={{ fontSize:10,color:"#6b7a8d" }}>Flagged issue</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Year sparkline + day drill-down ── */}
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>

          {/* Year overview bar chart */}
          <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e8edf2",padding:"16px",boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#1a2a3a",marginBottom:4 }}>📊 {viewYear} at a Glance</div>
            <div style={{ fontSize:10,color:"#9aa8b8",marginBottom:10 }}>Hours per month — click a bar to jump</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={yearMonthData} barSize={14} onClick={e=>{ if(e?.activeTooltipIndex!=null){ setViewMonth(e.activeTooltipIndex); setSelectedDay(null); } }}>
                <XAxis dataKey="month" tick={{ fontSize:9,fill:"#9aa8b8" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v,n)=>[`${v}${n==="hours"?" hrs":" visits"}`]} contentStyle={{ fontSize:11,borderRadius:8,border:"1px solid #e0e6ef" }} />
                <Bar dataKey="hours" name="hours" radius={[4,4,0,0]}>
                  {yearMonthData.map((entry,i)=>(
                    <Cell key={i} fill={i===viewMonth?"#1a4a7a":entry.hours>0?"#93c5fd":"#e8edf2"} cursor="pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Day detail panel */}
          {selectedDay ? (
            <div style={{ background:"#fff",borderRadius:14,border:"1px solid #e8edf2",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
              {/* Day header */}
              <div style={{ background:"linear-gradient(135deg,#1a4a7a 0%,#2563eb 100%)",padding:"14px 16px",color:"#fff" }}>
                <div style={{ fontSize:10,opacity:0.75,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2 }}>
                  {new Date(selectedDay+"T12:00").toLocaleDateString("en-US",{weekday:"long"})}
                </div>
                <div style={{ fontSize:18,fontWeight:700,fontFamily:"'Georgia',serif" }}>
                  {new Date(selectedDay+"T12:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
                </div>
                <div style={{ display:"flex",gap:14,marginTop:8 }}>
                  <div style={{ fontSize:11,opacity:0.85 }}>⏱ <strong>{selectedHours.toFixed(1)}h</strong> total</div>
                  <div style={{ fontSize:11,opacity:0.85 }}>📋 <strong>{selectedVisits.length}</strong> {selectedVisits.length===1?"visit":"visits"}</div>
                  <div style={{ fontSize:11,opacity:0.85 }}>🤝 <strong>{selectedVisits.reduce((s,v)=>s+v.totalInteractions,0)}</strong> interactions</div>
                </div>
              </div>

              {/* Visit list */}
              <div style={{ overflowY:"auto",maxHeight:400 }}>
                {selectedVisits.map((visit,vi)=>{
                  const hrs = parseDuration(visit.duration);
                  return (
                    <div key={visit.id}
                      onClick={()=>setDrillVisit(visit)}
                      style={{ padding:"12px 16px",borderBottom:"1px solid #f0f4f8",cursor:"pointer",transition:"background 0.12s" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#f7f9fc"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ display:"flex",alignItems:"flex-start",gap:10 }}>
                        {/* Client color dot */}
                        <div style={{ width:36,height:36,borderRadius:10,background:visit.clientColor+"22",border:`2px solid ${visit.clientColor}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>
                          {visit.clientLogo}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:700,color:"#1a2a3a",marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{visit.clientName}</div>
                          <div style={{ fontSize:11,color:"#6b7a8d",marginBottom:4 }}>{visit.visitType} · {visit.duration}</div>
                          {/* Chaplains */}
                          <div style={{ display:"flex",gap:4,flexWrap:"wrap" }}>
                            {visit.chaplains.map(ch=>(
                              <div key={ch} style={{ fontSize:10,padding:"1px 6px",borderRadius:6,background:"#eaf0ff",color:"#1a4a7a",fontWeight:600 }}>
                                {ch.replace("Rev. ","").replace("Chap. ","")}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0 }}>
                          <div style={{ fontSize:16,fontWeight:700,color:"#1a4a7a",fontFamily:"'Georgia',serif" }}>{hrs}<span style={{ fontSize:10,color:"#9aa8b8" }}>h</span></div>
                          <div style={{ fontSize:10,color:"#9aa8b8",marginTop:1 }}>{visit.totalInteractions} conv.</div>
                          {visit.flagIncident && <div style={{ fontSize:11,marginTop:2 }}>⚠️</div>}
                        </div>
                      </div>

                      {/* Interaction type mini pills */}
                      <div style={{ display:"flex",gap:4,marginTop:8,flexWrap:"wrap" }}>
                        {Object.entries(visit.interactions).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([key,cnt])=>{
                          const t = INTERACTION_TYPES.find(x=>x.key===key);
                          return t ? (
                            <div key={key} style={{ fontSize:10,padding:"2px 7px",borderRadius:8,background:"#f0f4f8",color:"#4a5568",display:"flex",alignItems:"center",gap:3 }}>
                              <span>{t.icon}</span> {cnt} {t.label.split(" ")[0]}
                            </div>
                          ) : null;
                        })}
                      </div>
                      <div style={{ fontSize:10,color:"#3b82f6",marginTop:6,fontWeight:600 }}>View full report →</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* No day selected — prompt */
            <div style={{ background:"#fff",borderRadius:14,border:"2px dashed #e0e6ef",padding:"32px 20px",textAlign:"center" }}>
              <div style={{ fontSize:36,marginBottom:12 }}>📅</div>
              <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a",marginBottom:6 }}>Select a day</div>
              <div style={{ fontSize:12,color:"#9aa8b8",lineHeight:1.6 }}>Click any highlighted day on the calendar to see chaplain visits, hours logged, and full interaction details.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Monthly summary bar breakdown ── */}
      <div style={{ marginTop:16,background:"#fff",borderRadius:14,border:"1px solid #e8edf2",padding:"18px 20px",boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
          <div style={{ fontSize:13,fontWeight:700,color:"#1a2a3a" }}>📈 Daily Hours — {MONTH_NAMES[viewMonth]} {viewYear}</div>
          <div style={{ fontSize:11,color:"#9aa8b8" }}>Click a bar to select that day</div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart
            data={Array.from({length:daysInMonth(viewYear,viewMonth)},(_,i)=>{
              const d = String(i+1).padStart(2,"0");
              const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${d}`;
              return { day:i+1, date:dateStr, hours: hoursByDate[dateStr]||0, visits:(visitsByDate[dateStr]||[]).length };
            })}
            barSize={14}
            onClick={e=>{ if(e?.activePayload?.[0]?.payload?.hours > 0) setSelectedDay(e.activePayload[0].payload.date); }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize:9,fill:"#9aa8b8" }} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={{ fontSize:9,fill:"#9aa8b8" }} axisLine={false} tickLine={false} unit="h" width={24} />
            <Tooltip formatter={(v,n)=>[`${v}${n==="hours"?" hrs":" visits"}`]} contentStyle={{ fontSize:11,borderRadius:8,border:"1px solid #e0e6ef" }} labelFormatter={d=>`Day ${d} of ${MONTH_NAMES[viewMonth]}`} />
            <Bar dataKey="hours" name="hours" radius={[4,4,0,0]}>
              {Array.from({length:daysInMonth(viewYear,viewMonth)},(_,i)=>{
                const d = String(i+1).padStart(2,"0");
                const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${d}`;
                const isSelected = selectedDay === dateStr;
                const hrs = hoursByDate[dateStr]||0;
                return <Cell key={i} fill={isSelected?"#1a4a7a":hrs>0?"#3b82f6":"#e8edf2"} cursor={hrs>0?"pointer":"default"} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Visit Detail Modal (full report) ── */}
      {drillVisit && <VisitDetailModal visit={drillVisit} onClose={()=>setDrillVisit(null)} />}
    </div>
  );
}

// ── App Shell (Sidebar Nav) ───────────────────────────────────────────────────
function AppShell({ page, setPage, user, setUser, lang, setLang, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const cc = "#1a4a7a";
  const lx = LANG[lang] || LANG.en;

  const NAV = [
    { id:"dashboard", label:"Dashboard",   emoji:"🏠", group:"main"    },
    { id:"visits",    label:"Visit Log",   emoji:"📒", group:"main"    },
    { id:"hours",     label:"Hours",       emoji:"🕐", group:"main"    },
    { id:"ecr",       label:"ECR Builder", emoji:"✏️",  group:"reports" },
    { id:"chaplains", label:"Chaplains",   emoji:"🤝", group:"reports" },
  ];
  const GROUPS = [
    { key:"main",    label:"Workspace"  },
    { key:"reports", label:"Analytics"  },
  ];
  const LANG_NAMES = { en:"English", es:"Español", fr:"Français" };
  const sideW = collapsed ? 64 : 220;

  return (
    <div style={{ display:"flex",minHeight:"100vh",fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>

      {/* ── Sidebar ── */}
      {/* NOTE: NO overflow:hidden here — it clips the popups. Clipping is only on the nav scroll area. */}
      <div style={{ width:sideW,flexShrink:0,background:"linear-gradient(180deg,#0f2441 0%,#1a4a7a 100%)",display:"flex",flexDirection:"column",position:"sticky",top:0,height:"100vh",transition:"width 0.22s cubic-bezier(.4,0,.2,1)",zIndex:200 }}>

        {/* Logo row */}
        <div style={{ padding:"18px 14px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.08)",flexShrink:0,overflow:"hidden" }}>
          <div style={{ width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0,border:"1.5px solid rgba(255,255,255,0.2)",letterSpacing:"-0.5px" }}>MM</div>
          {!collapsed && (
            <div style={{ overflow:"hidden",flex:1 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#fff",whiteSpace:"nowrap",lineHeight:1.2 }}>Marketplace</div>
              <div style={{ fontSize:11,color:"rgba(255,255,255,0.45)",whiteSpace:"nowrap" }}>Ministries Portal</div>
            </div>
          )}
          <button onClick={()=>setCollapsed(c=>!c)}
            style={{ border:"none",background:"rgba(255,255,255,0.08)",borderRadius:7,width:28,height:28,cursor:"pointer",color:"rgba(255,255,255,0.6)",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 0.15s",lineHeight:1 }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.18)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
            {collapsed?"›":"‹"}
          </button>
        </div>

        {/* Nav items — only this area clips overflow */}
        <div style={{ flex:1,overflowY:"auto",overflowX:"hidden",padding:"10px 8px" }}>
          {GROUPS.map(group=>{
            const items = NAV.filter(n=>n.group===group.key);
            return (
              <div key={group.key} style={{ marginBottom:18 }}>
                {!collapsed && <div style={{ fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.1em",padding:"2px 8px 8px",whiteSpace:"nowrap" }}>{group.label}</div>}
                {items.map(item=>{
                  const active = page===item.id;
                  return (
                    <button key={item.id} onClick={()=>setPage(item.id)} title={collapsed?item.label:""}
                      style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:collapsed?"10px 0":"10px 12px",justifyContent:collapsed?"center":"flex-start",borderRadius:9,border:"none",cursor:"pointer",background:active?"rgba(255,255,255,0.15)":"transparent",color:active?"#fff":"rgba(255,255,255,0.58)",fontSize:13,fontWeight:active?700:400,marginBottom:2,transition:"all 0.15s",textAlign:"left",position:"relative" }}
                      onMouseEnter={e=>{ e.currentTarget.style.background=active?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.08)"; e.currentTarget.style.color="#fff"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.background=active?"rgba(255,255,255,0.15)":"transparent"; e.currentTarget.style.color=active?"#fff":"rgba(255,255,255,0.58)"; }}>
                      {active && <div style={{ position:"absolute",left:0,top:"18%",height:"64%",width:3,background:"#5b9cf6",borderRadius:"0 3px 3px 0" }} />}
                      <span style={{ fontSize:17,flexShrink:0,lineHeight:1 }}>{item.emoji}</span>
                      {!collapsed && <span style={{ whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Bottom: language + user — no overflow clip, popups use position:fixed */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.08)",padding:"10px 8px",flexShrink:0 }}>

          {/* Language trigger */}
          <button onClick={()=>{ setLangOpen(o=>!o); setProfileOpen(false); }} title={collapsed?LANG_NAMES[lang]:""}
            style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:collapsed?"9px 0":"9px 12px",justifyContent:collapsed?"center":"flex-start",borderRadius:9,border:"none",cursor:"pointer",background:langOpen?"rgba(255,255,255,0.1)":"transparent",color:"rgba(255,255,255,0.55)",fontSize:12,transition:"all 0.15s",marginBottom:4 }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}
            onMouseLeave={e=>e.currentTarget.style.background=langOpen?"rgba(255,255,255,0.1)":"transparent"}>
            <span style={{ fontSize:16,flexShrink:0 }}>🌐</span>
            {!collapsed && <><span style={{ flex:1,textAlign:"left" }}>{LANG_NAMES[lang]}</span><span style={{ fontSize:10,opacity:0.4 }}>▾</span></>}
          </button>

          {/* User trigger */}
          <button onClick={()=>{ setProfileOpen(o=>!o); setLangOpen(false); }}
            style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:collapsed?"9px 0":"9px 12px",justifyContent:collapsed?"center":"flex-start",borderRadius:9,border:"none",cursor:"pointer",background:profileOpen?"rgba(255,255,255,0.12)":"transparent",transition:"all 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}
            onMouseLeave={e=>e.currentTarget.style.background=profileOpen?"rgba(255,255,255,0.12)":"transparent"}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0,border:"1.5px solid rgba(255,255,255,0.25)" }}>{user.avatar}</div>
            {!collapsed && (
              <div style={{ flex:1,textAlign:"left",overflow:"hidden",minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{user.name}</div>
                <div style={{ fontSize:10,color:"rgba(255,255,255,0.4)",whiteSpace:"nowrap" }}>{user.role} · {user.region}</div>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ── Popups rendered at root level (fixed) so overflow:hidden can't clip them ── */}
      {langOpen && (
        <div style={{ position:"fixed",bottom:80,left:collapsed?72:228,background:"#fff",borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,0.22)",overflow:"hidden",minWidth:160,zIndex:9999 }}>
          {Object.entries(LANG_NAMES).map(([code,name])=>(
            <button key={code} onClick={()=>{ setLang(code); setLangOpen(false); }}
              style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"11px 16px",border:"none",background:lang===code?"#f0f4f8":"#fff",cursor:"pointer",fontSize:13,fontWeight:lang===code?700:400,color:lang===code?cc:"#1a2a3a",textAlign:"left" }}>
              {lang===code && <span style={{ color:cc,fontSize:11 }}>✓</span>}
              {lang!==code && <span style={{ width:11,display:"inline-block" }} />}
              {name}
            </button>
          ))}
        </div>
      )}

      {profileOpen && (
        <div style={{ position:"fixed",bottom:20,left:collapsed?72:228,background:"#fff",borderRadius:12,boxShadow:"0 8px 40px rgba(0,0,0,0.22)",overflow:"hidden",minWidth:240,zIndex:9999 }}>
          <div style={{ padding:"16px",borderBottom:"1px solid #f0f4f8" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:user.vpName?10:0 }}>
              <div style={{ width:40,height:40,borderRadius:"50%",background:cc,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff" }}>{user.avatar}</div>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:"#1a2a3a" }}>{user.name}</div>
                <div style={{ fontSize:11,color:"#9aa8b8",marginTop:1 }}>{user.email}</div>
              </div>
            </div>
            {user.vpName && <div style={{ fontSize:11,color:"#6b7a8d",background:"#f7f9fc",borderRadius:7,padding:"6px 10px" }}>Reports to: <strong style={{ color:"#1a2a3a" }}>{user.vpName}</strong> · {user.region}</div>}
          </div>
          <div style={{ padding:"8px" }}>
            <button style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:"none",background:"transparent",cursor:"pointer",fontSize:13,color:"#6b7a8d",textAlign:"left",display:"flex",alignItems:"center",gap:8 }}
              onMouseEnter={e=>e.currentTarget.style.background="#f0f4f8"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              ⚙️ Settings
            </button>
            <button onClick={()=>{ setUser(null); setProfileOpen(false); }}
              style={{ width:"100%",padding:"9px 12px",borderRadius:8,border:"none",background:"transparent",cursor:"pointer",fontSize:13,color:"#e74c3c",textAlign:"left",fontWeight:600,display:"flex",alignItems:"center",gap:8 }}
              onMouseEnter={e=>e.currentTarget.style.background="#fdedec"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              → {lx.signOut}
            </button>
          </div>
        </div>
      )}

      {/* Click-away to close popups */}
      {(profileOpen||langOpen) && (
        <div onClick={()=>{ setProfileOpen(false); setLangOpen(false); }}
          style={{ position:"fixed",inset:0,zIndex:9998 }} />
      )}

      {/* ── Main column ── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",minWidth:0,background:"#f0f4f8" }}>
        {/* Slim top bar */}
        <div style={{ background:"#fff",borderBottom:"1px solid #e0e6ef",height:50,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",position:"sticky",top:0,zIndex:100,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <span style={{ fontSize:11,color:"#b0bcc8" }}>Marketplace Ministries</span>
            <span style={{ fontSize:11,color:"#c8d0da" }}>›</span>
            <span style={{ fontSize:13,fontWeight:700,color:"#1a2a3a" }}>{NAV.find(n=>n.id===page)?.label||"Dashboard"}</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:cc+"15",color:cc }}>{user.role}{user.region!=="National"?` · ${user.region}`:""}</div>
            <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#9aa8b8" }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#27ae60" }}/>CRM synced
            </div>
          </div>
        </div>
        {/* Content */}
        <div style={{ flex:1,overflow:"auto" }}>{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState("en");
  const [page, setPage] = useState("dashboard"); // "dashboard" | "ecr" | "chaplains" | "visits"
  const [selectedClient, setSelectedClient] = useState(null);
  const [drawerMode, setDrawerMode] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const lx = LANG[lang] || LANG.en;

  if (!user) return <LoginScreen onLogin={setUser} lang={lang} setLang={setLang} />;

  const allClients = getClientsForUser(user);

  // All pages use AppShell
  if (page === "hours") {
    return (
      <AppShell page={page} setPage={setPage} user={user} setUser={setUser} lang={lang} setLang={setLang}>
        <HoursCalendarPage user={user} allClients={allClients} />
      </AppShell>
    );
  }

  if (page === "ecr") {
    return (
      <AppShell page={page} setPage={setPage} user={user} setUser={setUser} lang={lang} setLang={setLang}>
        <ECRBuilder preselectedClient={selectedClient} allClients={allClients} onBack={()=>setPage("dashboard")} />
      </AppShell>
    );
  }

  if (page === "chaplains") {
    return (
      <AppShell page={page} setPage={setPage} user={user} setUser={setUser} lang={lang} setLang={setLang}>
        <ChaplainDashboard clients={allClients} onBack={()=>setPage("dashboard")} />
      </AppShell>
    );
  }

  if (page === "visits") {
    return (
      <AppShell page={page} setPage={setPage} user={user} setUser={setUser} lang={lang} setLang={setLang}>
        <VisitLogPage user={user} allClients={allClients} onBack={()=>setPage("dashboard")} />
      </AppShell>
    );
  }

  const filtered = allClients.filter(c => {
    const mf = filter==="all"||c.health===filter;
    const ms = c.name.toLowerCase().includes(search.toLowerCase())||c.contact.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const cc = "#1a4a7a";

  const openClient = (client) => { setSelectedClient(client); setDrawerMode("client"); };
  const closeDrawer = () => { setDrawerMode(null); };

  return (
    <AppShell page={page} setPage={setPage} user={user} setUser={setUser} lang={lang} setLang={setLang}>
      {/* Drawers */}
      {drawerMode==="client" && selectedClient && (
        <ClientDrawer client={selectedClient} user={user} onClose={closeDrawer}
          onBuildReport={()=>setDrawerMode("builder")}
          onTimeExpense={()=>setDrawerMode("timeexp")}
          onVisit={()=>setDrawerMode("visit")} />
      )}
      {drawerMode==="timeexp" && selectedClient && (
        <TimeExpenseDrawer client={selectedClient} user={user} onClose={()=>setDrawerMode("client")} />
      )}
      {drawerMode==="visit" && selectedClient && (
        <OnSiteVisitDrawer client={selectedClient} user={user} onClose={()=>setDrawerMode("client")} />
      )}
      {drawerMode==="builder" && (
        <div onClick={closeDrawer} style={{ position:"fixed",inset:0,background:"rgba(10,20,40,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:16,padding:"40px",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:32,marginBottom:12 }}>✏️</div>
            <div style={{ fontSize:18,fontWeight:700,color:"#1a2a3a",marginBottom:6 }}>ECR Report Builder</div>
            <div style={{ fontSize:13,color:"#6b7a8d",marginBottom:24 }}>Open the full builder pre-loaded with <strong>{selectedClient?.name}</strong>?</div>
            <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
              <button onClick={()=>{closeDrawer();setPage("ecr");}} style={{ padding:"10px 24px",borderRadius:8,border:"none",background:cc,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer" }}>Open Builder →</button>
              <button onClick={closeDrawer} style={{ padding:"10px 24px",borderRadius:8,border:"1px solid #d0dae6",background:"transparent",color:"#6b7a8d",fontSize:13,cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ maxWidth:1200,margin:"0 auto",padding:"28px 20px" }}>
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:26,fontWeight:700,color:"#1a2a3a",margin:"0 0 4px",fontFamily:"'Georgia',serif" }}>Welcome back, {user.name.split(" ")[0]} 👋</h1>
          <p style={{ fontSize:14,color:"#6b7a8d",margin:0 }}>{allClients.length} assigned clients · {user.region} Region · Data synced from Dynamics CRM</p>
        </div>

        <StatsBar clients={allClients} color={cc} onChaplains={()=>setPage("chaplains")} />

        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
          <div style={{ position:"relative",flex:1,maxWidth:320 }}>
            <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#9aa8b8" }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients or contacts..."
              style={{ width:"100%",padding:"9px 12px 9px 32px",borderRadius:8,border:"1px solid #d0dae6",fontSize:13,color:"#1a2a3a",background:"#fff",outline:"none",boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex",gap:6 }}>
            {[["all","All"],["green","On Track"],["yellow","Due Soon"],["red","Overdue"]].map(([val,label])=>(
              <button key={val} onClick={()=>setFilter(val)}
                style={{ padding:"8px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",background:filter===val?(val==="green"?"#27ae60":val==="yellow"?"#f39c12":val==="red"?"#e74c3c":cc):"#fff",color:filter===val?"#fff":"#6b7a8d",border:filter===val?"none":"1px solid #d0dae6",transition:"all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft:"auto",fontSize:12,color:"#9aa8b8" }}>Showing <strong style={{ color:"#1a2a3a" }}>{filtered.length}</strong> of {allClients.length}</div>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16 }}>
          {filtered.map(client=><ClientCard key={client.id} client={client} onClick={()=>openClient(client)} />)}
        </div>

        <div style={{ marginTop:32,padding:"14px 20px",background:"#fff",borderRadius:10,border:"1px solid #e0e6ef",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#6b7a8d" }}>
            <div style={{ width:8,height:8,borderRadius:"50%",background:"#27ae60" }} />
            Connected to <strong style={{ color:"#1a2a3a" }}>Microsoft Dynamics 365 CRM</strong> · Last sync: 2 minutes ago
          </div>
          <button style={{ border:"none",background:"#f0f4f8",borderRadius:7,padding:"6px 12px",fontSize:12,cursor:"pointer",color:"#6b7a8d" }}>🔄 Sync Now</button>
        </div>
      </div>
    </AppShell>
  );
}
