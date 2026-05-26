const mysql = require('mysql2/promise');
require('dotenv').config();

const teamContent = {
  'Red Team': {
    description: 'Offensive security and adversary simulation unit for exploitation, infrastructure testing, CVE lab development, and attack-path validation.',
    technical_summary: 'Builds and validates offensive labs across web exploitation, boot2root, CVE simulation, Active Directory style pivoting, C2/advisory simulations, and controlled infrastructure compromise paths.',
    current_objective: 'Lead Incognitrix Range offensive tracks and convert lab findings into safe, repeatable practice environments.'
  },
  'Blue Team': {
    description: 'Defensive operations unit focused on malware analysis, logs, detection engineering, forensics, SIEM, and response workflows.',
    technical_summary: 'Maintains malware-analysis tasks, Wazuh/EDR monitoring, forensic exercises, incident timelines, and detection content for blue-team learning.',
    current_objective: 'Strengthen the Malware Lab, Forensic Challenges, and EDR alerting workflows inside Incognitrix Range.'
  },
  'CVE Hunt Team': {
    description: 'Vulnerability research team responsible for CVE review, reproduction, documentation, and responsible disclosure tracking.',
    technical_summary: 'Works on CVE labs, vulnerable application analysis, proof validation, mitigation notes, and structured CVE simulation content.',
    current_objective: 'Maintain verified CVE records and turn public vulnerabilities into guided simulations for the Range.'
  },
  'Escape Room Team': {
    description: 'Challenge design team for puzzle-driven security rooms, forensic trails, and interactive cyber problem solving.',
    technical_summary: 'Creates scenario-based tasks with flags, clues, staged evidence, and challenge chains for learner progression.',
    current_objective: 'Expand room-style challenges that blend web, forensics, crypto, OSINT, and reverse engineering.'
  },
  'Networking Team': {
    description: 'Lab networking and infrastructure team responsible for isolated network architecture, cluster management, and network visualization.',
    technical_summary: 'Maintains controlled lab network access, Raspberry Pi master/worker load balancing with HAProxy, JOBE compilation workers, and network request simulation dashboards.',
    current_objective: 'Keep internal lab systems reachable from the internet while protecting them from other external networks, and publish clear architecture dashboards.'
  },
  'Academy Team': {
    description: 'Learning-content team for Incognitrix Academy modules, roadmaps, guided exercises, and practical cyber security curriculum.',
    technical_summary: 'Builds markdown-backed learning modules, challenge walkthroughs, learner tracks, and supporting material from lab activity.',
    current_objective: 'Turn lab work into reusable practical lessons and structured learning paths.'
  },
  'Range Team': {
    description: 'Operations team for Incognitrix Range, covering offensive simulations, Pro Labs, Boot2Root, CVE simulations, CTFs, malware labs, forensics, and EDR setups.',
    technical_summary: 'Runs multi-track practical environments that include adversary simulation, enterprise-like infrastructure compromise, single-machine privilege escalation, and blue-team analysis workflows.',
    current_objective: 'Maintain reliable hands-on environments for both offensive and defensive training.'
  },
  'Portfolio Team': {
    description: 'Portal and data presentation team for public lab information, projects, teams, individual profiles, CVEs, and achievements.',
    technical_summary: 'Maintains the React/Express/MySQL portal, dashboard views, database-backed pages, Docker seed data, and Google Sheet import tooling.',
    current_objective: 'Keep lab data accurate, portable, and presentable across dashboard, team, project, CVE, and achievement pages.'
  },
  'AR VR Team': {
    description: 'Immersive cyber learning team building AR/VR scenes, network-device visualizations, and interactive security demonstrations.',
    technical_summary: 'Uses Unity, VR interaction patterns, 3D assets, network-device models, and mixed-reality UI panels for cyber awareness and simulation.',
    current_objective: 'Develop immersive modules for cyber games, network architecture visualization, and practical lab demonstrations.'
  },
  'Career Team': {
    description: 'Career enablement project team for placement preparation, job discovery experiments, and learner career support.',
    technical_summary: 'Explores job scraping/fetching, placement assessment workflows, and career-oriented automation while staying within platform limits.',
    current_objective: 'Support members with placement preparation and practical career tooling.'
  },
  'Project Team': {
    description: 'Project execution group for prototype delivery, hardware-assisted learning, and cross-team implementation tasks.',
    technical_summary: 'Coordinates project builds, documentation, prototype milestones, and integration between Academy, Range, Portfolio, AR/VR, and Networking work.',
    current_objective: 'Move prototypes into usable lab modules and public portfolio records.'
  }
};

const achievementContent = {
  'ACN CTF': {
    description: 'Amrita CyberNation (ACN) 2025 was inaugurated at Amrita Vishwa Vidyapeetham, Chennai campus as a cybersecurity-focused event bringing industry and academic voices together. Incognitrix records this result as a podium CTF achievement from the ACN event context.',
    future_scope: 'Document the solved categories and convert the learning into forensic, web, and defensive challenge material for Academy and Range.'
  },
  'L3m0n CTF': {
    description: 'L3m0n CTF 2025 was a 24-hour Jeopardy-style CTF at Amrita Vishwa Vidyapeetham, Coimbatore, presented by TIFAC-CORE in Cyber Security and Amrita. Public event details list Web, Crypto, Pwn, Reverse, Forensics, Misc, OSINT, and GeoOSINT categories.',
    future_scope: 'Turn the strongest solves into internal writeups and create follow-up CTF challenges across web, crypto, reverse, forensics, and OSINT.'
  },
  '0xti CTF': {
    description: '0xTi CTF was a 24-hour offline Capture the Flag event at Rajalakshmi Engineering College, Chennai, under HackTiVate/Titanium 2026. Public event details describe beginner-to-expert challenges, teams of 2-3, and a prize pool worth Rs. 1.5 lakhs.',
    future_scope: 'Use the event experience to improve competition readiness, timed CTF workflows, and team coordination for future offline contests.'
  },
  'HackQuest': {
    description: 'HackQuest 2026 was a national-level Capture the Flag/web hacking competition organized by Jamal Mohamed College, Trichy, in collaboration with CyberHeals, according to public achievement/event references.',
    future_scope: 'Build web-hacking practice modules and timed challenge sets based on the techniques exercised during the competition.'
  },
  'KI CTF': {
    description: 'KI CTF 2026 was an on-site Jeopardy-style CTF at Kumaraguru College of Technology, Coimbatore, part of Cyber Conclave/Yugam 2026. Public listings mention Web, Pwn, Reverse, Forensics, AI, and Crypto challenge domains.',
    future_scope: 'Expand Range challenge categories with AI, pwn, reverse, web, crypto, and forensic tasks inspired by the event.'
  },
  'Inno Blitz': {
    description: 'Inno Blitz 2.0 was a national-level technical event at Sri Ramakrishna Engineering College, Coimbatore, themed around transforming ideas into reality, with project presentation, ideathon, and buildathon-style activities.',
    future_scope: 'Convert the project outcome into a clearer prototype story and connect it with Academy, AR/VR, and Portfolio demonstrations.'
  }
};

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  for (const [name, content] of Object.entries(teamContent)) {
    await pool.query(
      'UPDATE teams SET description = ?, technical_summary = ?, current_objective = ? WHERE name = ?',
      [content.description, content.technical_summary, content.current_objective, name]
    );
  }

  for (const [title, content] of Object.entries(achievementContent)) {
    await pool.query(
      'UPDATE achievements SET description = ?, future_scope = ? WHERE title = ?',
      [content.description, content.future_scope, title]
    );
  }

  await pool.end();
  console.log(`Updated ${Object.keys(teamContent).length} team records and ${Object.keys(achievementContent).length} achievement records.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
