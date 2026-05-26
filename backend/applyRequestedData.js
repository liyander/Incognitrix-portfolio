const mysql = require('mysql2/promise');
require('dotenv').config();

const cves = [
  {
    cve_number: 'CVE-2026-33054',
    product: 'Mesop AI Framework (Google)',
    finder: 'Liyander Rishwanth',
    details: 'Mesop path traversal vulnerability. Public sources describe arbitrary file targeting with denial-of-service or file manipulation impact.',
    references: ['https://www.sentinelone.com/vulnerability-database/cve-2026-33054/', 'https://www.thehackerwire.com/mesop-critical-path-traversal-cve-2026-33054/']
  },
  {
    cve_number: 'CVE-2026-33057',
    product: 'Mesop AI Framework (Google)',
    finder: 'Liyander Rishwanth',
    details: 'Mesop unrestricted code execution issue in the AI sandbox/debug Flask server, including the /exec-py style testing/debug path described by public sources.',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2026-33057', 'https://www.sentinelone.com/vulnerability-database/cve-2026-33057/']
  },
  {
    cve_number: 'CVE-2025-59540',
    product: 'chamilo-lms',
    finder: 'Liyander Rishwanth',
    details: 'Chamilo LMS stored cross-site scripting in exercise feedback before 1.11.34.',
    references: ['https://app.opencve.io/cve/CVE-2025-59540', 'https://github.com/chamilo/chamilo-lms/security/advisories/GHSA-59h4-34mx-m67m']
  },
  {
    cve_number: 'CVE-2026-33148',
    product: 'Recipes CMS',
    finder: 'Liyander Rishwanth',
    details: 'Tandoor Recipes denial-of-service issue reported by public vulnerability databases.',
    references: ['https://www.sentinelone.com/vulnerability-database/cve-2026-33148/']
  },
  {
    cve_number: 'CVE-2026-29055',
    product: 'Recipes CMS',
    finder: 'Liyander Rishwanth',
    details: 'Tandoor Recipes issue before 2.6.0 where WebP/GIF image processing skips metadata stripping, rescaling, and size validation, exposing sensitive metadata/resource-risk behavior.',
    references: ['https://radar.offseq.com/threat/cve-2026-29055-cwe-1230-exposure-of-sensitive-info-58c6e1d8']
  },
  {
    cve_number: 'CVE-2026-33153',
    product: 'Recipes CMS',
    finder: 'Liyander Rishwanth',
    details: 'Tandoor Recipes debug parameter leaks raw SQL queries, schema details, table names, joins, and access-control logic before 2.6.0.',
    references: ['https://cvefeed.io/vuln/detail/CVE-2026-33153']
  },
  {
    cve_number: 'CVE-2026-30606',
    product: 'Mealie CMS',
    finder: 'Liyander Rishwanth',
    details: 'No reliable public detail was found during search for this CVE/product pair. Recorded only as a claimed lab finding from the provided list.',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2026-30606']
  },
  {
    cve_number: 'CVE-2026-35441',
    product: 'Directus CMS',
    finder: 'Liyander Rishwanth',
    details: 'Directus GraphQL aliasing denial-of-service/resource-exhaustion issue before 11.17.0.',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2026-35441', 'https://github.com/directus/directus/security/advisories/GHSA-ph52-67fq-75wj']
  },
  {
    cve_number: 'CVE-2026-48151',
    product: 'Budibase',
    finder: 'Liyander Rishwanth',
    details: 'No reliable public detail was found during search for this CVE/product pair. Recorded only as a claimed lab finding from the provided list.',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2026-48151']
  },
  {
    cve_number: 'CVE-2026-39307',
    product: 'PraisonAI',
    finder: 'Liyander Rishwanth',
    details: 'PraisonAI template installation Zip Slip/path traversal issue allowing arbitrary file writes before the patched release noted by public sources.',
    references: ['https://www.sentinelone.com/vulnerability-database/cve-2026-39307/', 'https://security.snyk.io/vuln/SNYK-PYTHON-PRAISONAI-16002873']
  },
  {
    cve_number: 'CVE-2026-39305',
    product: 'PraisonAI',
    finder: 'Liyander Rishwanth',
    details: 'PraisonAI Action Orchestrator path traversal issue allowing writes outside the configured workspace.',
    references: ['https://www.sentinelone.com/vulnerability-database/cve-2026-39305/', 'https://vulmon.com/vulnerabilitydetails?qid=CVE-2026-39305']
  },
  {
    cve_number: 'CVE-2026-33756',
    product: 'Saleor',
    finder: 'Harish Kumar',
    details: 'Saleor denial-of-service issue caused by unbounded GraphQL query batching, fixed in 3.23.0a3, 3.22.47, 3.21.54, and 3.20.118.',
    references: ['https://nvd.nist.gov/vuln/detail/CVE-2026-33756', 'https://www.sentinelone.com/vulnerability-database/cve-2026-33756/']
  },
  {
    cve_number: 'CVE-2026-27460',
    product: 'Recipes Application',
    finder: 'Harish Kumar',
    details: 'Tandoor Recipes denial-of-service issue in recipe import where ZIP bomb uploads can crash or degrade the server before 2.6.5.',
    references: ['https://www.sentinelone.com/vulnerability-database/cve-2026-27460/', 'https://www.tenable.com/cve/CVE-2026-27460']
  }
];

const rangeDescription = `Incognitrix Range provides offensive and defensive practical environments.

Offensive:
1. Advisor Simulation: Purple-team/advisory simulations that model threat actors to test defenses and policies.
2. Pro Labs and Mini Pro Labs: Persistent multi-machine enterprise environments, including Active Directory style pivoting and full infrastructure compromise paths.
3. Boot2Root Machines: Single-target machines where learners gain user access and escalate to root/system.
4. CVE Simulations: Guided labs for specific CVEs, focused on critical vulnerabilities published over the past five years.
5. CTF Challenges: Flag-based challenges across web, forensics, crypto, networking, and reverse engineering.

Blue Teaming:
1. Malware Lab: Controlled sandbox environments for analyzing malicious software behavior, communication, and file changes.
2. Forensic Challenges: Memory dumps, disk images, and logs used to reconstruct breach timelines and identify evidence.
3. EDR Setups: Wazuh-based endpoint detection and response setups with alerting and suspicious-behavior detection.`;

const rangeTimeline = [
  {
    phase: 'OFFENSIVE',
    title: 'Advisor Simulation',
    desc: 'Purple-team/advisory simulations that model threat actors to test defenses and policies.',
    active: true
  },
  {
    phase: 'OFFENSIVE',
    title: 'Pro Labs and Mini Pro Labs',
    desc: 'Persistent multi-machine enterprise environments, including Active Directory style pivoting and full infrastructure compromise paths.',
    active: true
  },
  {
    phase: 'OFFENSIVE',
    title: 'Boot2Root Machines',
    desc: 'Single-target machines where learners gain user access and escalate to root/system.',
    active: true
  },
  {
    phase: 'OFFENSIVE',
    title: 'CVE Simulations',
    desc: 'Guided labs for specific CVEs, focused on critical vulnerabilities published over the past five years.',
    active: true
  },
  {
    phase: 'OFFENSIVE',
    title: 'CTF Challenges',
    desc: 'Flag-based challenges across web, forensics, crypto, networking, and reverse engineering.',
    active: true
  },
  {
    phase: 'BLUE TEAMING',
    title: 'Malware Lab',
    desc: 'Controlled sandbox environments for analyzing malicious software behavior, communication, and file changes.',
    active: true
  },
  {
    phase: 'BLUE TEAMING',
    title: 'Forensic Challenges',
    desc: 'Memory dumps, disk images, and logs used to reconstruct breach timelines and identify evidence.',
    active: true
  },
  {
    phase: 'BLUE TEAMING',
    title: 'EDR Setups',
    desc: 'Wazuh-based endpoint detection and response setups with alerting and suspicious-behavior detection.',
    active: true
  }
];

const academyDescription = `Incognitrix Academy is the practical learning arm of the lab. It contains hands-on modules, guided exercises, challenge walkthroughs, and learner roadmaps that turn lab work into repeatable practice.`;

const networkingSummary = `Networking:
1. Network Architecture: A controlled and restricted lab network where internal systems can reach the internet while external networks cannot access internal lab systems.
2. Load Balancing & Cluster Management: Raspberry Pi cluster with one master and four worker nodes. HAProxy handles load balancing on the master, while JOBE balancer workers handle compilation jobs and return output.
3. Network Dashboard: A dashboard that visualizes lab network architecture and simulates network requests flowing through the lab.`;

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'CTF',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'incognitrix_db_new'
  });

  await pool.query('TRUNCATE TABLE cves');
  for (const cve of cves) {
    await pool.query(
      'INSERT INTO cves (cve_number, details, poc, reference_link, contributors) VALUES (?, ?, ?, ?, ?)',
      [
        cve.cve_number,
        `${cve.product}: ${cve.details}`,
        'Public details and lab reproduction notes are tracked by the named finder. No exploit payload is stored here.',
        JSON.stringify(cve.references),
        JSON.stringify([cve.finder])
      ]
    );
  }

  await pool.query(
    'UPDATE projects SET description = ?, shortDesc = ?, team = ?, priority = ?, usage_desc = ?, stack = ?, timeline = ?, operatives = ? WHERE title = ?',
    [
      rangeDescription,
      'Offensive and blue-team practical range with advisor simulations, pro labs, boot2root, CVE simulations, CTFs, malware lab, forensics, and EDR setups.',
      'Range Team',
      'Range Team',
      'Used to run practical cyber security training across adversary simulation, infrastructure compromise, CVE reproduction, CTF challenges, malware analysis, forensics, and Wazuh EDR practice.',
      JSON.stringify(['Docker', 'Linux', 'Active Directory Labs', 'Wazuh', 'CTF Engine', 'Malware Sandbox', 'Forensics']),
      JSON.stringify(rangeTimeline),
      JSON.stringify([{ name: 'Liyander Rishwanth', role: 'Lead Developer' }]),
      'Incognitrix Range'
    ]
  );

  await pool.query(
    'UPDATE projects SET description = ?, shortDesc = ?, team = ?, priority = ?, usage_desc = ?, operatives = ? WHERE title = ?',
    [
      academyDescription,
      'Practical cyber security learning modules, guided exercises, and learner roadmaps.',
      'Academy Team',
      'Academy Team',
      'Used for practical learning, module delivery, challenge walkthroughs, and structured cyber security roadmaps.',
      JSON.stringify([{ name: 'Liyander Rishwanth', role: 'Lead Developer' }]),
      'Incognitrix Academy'
    ]
  );

  await pool.query(
    'UPDATE projects SET operatives = ? WHERE title = ?',
    [JSON.stringify([
      { name: 'Liyander Rishwanth', role: 'Lead Developer' },
      { name: 'Abinesh', role: 'Product Lead' }
    ]), 'Incognitrix Portfolio']
  );

  await pool.query(
    'UPDATE projects SET operatives = ? WHERE title = ?',
    [JSON.stringify([
      { name: 'Liyander Rishwanth', role: 'Lead Developer' },
      { name: 'Keerthi Ragavan', role: 'Product Lead' }
    ]), 'Incognitrix Range']
  );

  await pool.query(
    'UPDATE projects SET operatives = ? WHERE title = ?',
    [JSON.stringify([{ name: 'Kowshik T', role: 'Lead Developer' }]), 'AR VR Project']
  );

  await pool.query(
    'UPDATE projects SET operatives = ? WHERE title = ?',
    [JSON.stringify([{ name: 'Harish Kumar N', role: 'Lead Developer' }]), 'Incognitrix Career']
  );

  await pool.query(
    'UPDATE teams SET description = ?, technical_summary = ?, current_objective = ? WHERE name = ?',
    [
      'Networking team responsible for lab network design, cluster operations, and traffic visualization.',
      networkingSummary,
      'Maintain the restricted lab network, Raspberry Pi load-balancing cluster, JOBE compilation workers, and the network simulation dashboard.',
      'Networking Team'
    ]
  );

  await pool.end();
  console.log(`Applied ${cves.length} exact CVE records, updated Incognitrix Range, Incognitrix Academy, and Networking Team content.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { cves, rangeDescription, rangeTimeline, academyDescription, networkingSummary };
