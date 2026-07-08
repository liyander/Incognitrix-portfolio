const mysql = require('mysql2/promise');
require('dotenv').config();

const projects = [
  {
    id: 'PROJ-6',
    title: 'Project Romulus - AI-Powered Cyber Breach Simulation Platform',
    status: 'Planned / In Development',
    priority: 'High Priority', 
    team: 'AI, Cybersecurity, SOC, Threat Intelligence Team',
    shortDesc: 'An AI-powered cyber breach simulation platform that converts real-world attack reports into practical investigation scenarios for corporate security teams.',
    description: `Project Romulus is designed to help organizations prepare their employees and security teams for real-world cyber incidents. When a new cyberattack, breach, malware campaign, or threat actor activity is reported, the admin can feed URLs of reports, articles, or threat intelligence sources into the platform.

The AI analyzes the provided content and generates a realistic attack scenario based on the actual incident. The platform creates logs, artifacts, investigation questions, containment tasks, and guided challenges for players. Users must investigate the incident, identify attack techniques, answer questions, and perform containment steps.

This helps corporate teams practice incident response, SOC investigation, threat hunting, and breach containment using scenarios inspired by real attacks.`,
    stack: ['AI/LLM', 'Python', 'FastAPI', 'Node.js', 'React', 'Docker', 'Wazuh', 'Elastic Stack', 'Sigma Rules', 'MITRE ATT&CK', 'Threat Intelligence APIs', 'PostgreSQL', 'Redis', 'Kubernetes', 'SIEM Logs', 'Incident Artifacts', 'Report URLs', 'Scenario Generator', 'Question Generator'],
    beneficiaries: 'SOC Analysts, Security Engineers, Incident Response Teams, Threat Hunters, Cybersecurity Students, Corporate Security Teams, Blue Team Trainers',
    usageDesc: 'Used for practical learning, module delivery, challenge walkthroughs, and structured cyber security roadmaps. It can be deployed in a corporate lab environment where admins upload recent breach reports and generate hands-on cyber incident simulations for employees or learners.',
    timeline: [{ phase: 'PLANNED', title: 'MVP Development', desc: 'Target delivery: 1 to 1.5 months', active: true }]
  },
  {
    id: 'PROJ-7',
    title: 'AI-Integrated Continuous Red Team Operations Platform',
    status: 'Planned / In Development',
    priority: 'High Priority',
    team: 'Red Team, AI, DevSecOps, Infrastructure Security Team',
    shortDesc: 'An AI-driven continuous red teaming platform that automatically simulates emerging MITRE ATT&CK techniques inside a controlled infrastructure.',
    description: `This project focuses on building an AI-integrated continuous red team operation platform. The system continuously monitors new and emerging threats, attack techniques, and MITRE ATT&CK updates. Whenever a new threat or technique is identified, the AI maps it to real-world attack behavior and safely replicates the scenario inside the organization's controlled infrastructure.

The platform performs automated red team phases such as reconnaissance, initial access simulation, privilege escalation testing, lateral movement validation, persistence checks, defense evasion testing, and impact simulation. It helps organizations understand whether their current infrastructure, detection rules, SOC tools, and security controls can withstand modern attacks.

The system can also generate attack reports, detection gaps, remediation suggestions, security scores, and executive summaries. Human approval can be added before executing high-impact simulations.`,
    stack: ['AI/LLM', 'Python', 'Go', 'FastAPI', 'React', 'Docker', 'Kubernetes', 'MITRE ATT&CK', 'Caldera', 'Atomic Red Team', 'Wazuh', 'Elastic Stack', 'Sigma', 'YARA', 'Suricata', 'Zeek', 'Prometheus', 'Grafana', 'Agents', 'Red Team Automation', 'Attack Simulation', 'Detection Engineering', 'DevSecOps Pipeline'],
    beneficiaries: 'Red Teamers, Blue Teamers, SOC Teams, Security Engineers, DevSecOps Teams, Threat Hunters, Enterprises, Cybersecurity Training Teams',
    usageDesc: 'Used for practical learning, module delivery, challenge walkthroughs, and structured cyber security roadmaps. It can be deployed in a lab, enterprise test environment, or cyber range to continuously validate security controls against new MITRE-based attack techniques.',
    timeline: [{ phase: 'PLANNED', title: 'MVP Development', desc: 'Target delivery: 1.5 to 2 months', active: true }]
  }
];

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  try {
    for (const project of projects) {
      await pool.query(
        `INSERT INTO projects
          (id, title, status, priority, description, shortDesc, image, stack, timeline, beneficiaries, team, usage_desc, operatives)
         VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          title = VALUES(title), status = VALUES(status), priority = VALUES(priority),
          description = VALUES(description), shortDesc = VALUES(shortDesc), stack = VALUES(stack),
          timeline = VALUES(timeline), beneficiaries = VALUES(beneficiaries), team = VALUES(team),
          usage_desc = VALUES(usage_desc)`,
        [
          project.id,
          project.title,
          project.status,
          project.priority,
          project.description,
          project.shortDesc,
          JSON.stringify(project.stack),
          JSON.stringify(project.timeline),
          project.beneficiaries,
          project.team,
          project.usageDesc,
          JSON.stringify([])
        ]
      );
    }
  } finally {
    await pool.end();
  }

  console.log(`Applied ${projects.length} project records.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { projects };
