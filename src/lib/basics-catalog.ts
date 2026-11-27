// Light copy of functions/src/basics/catalog.ts for the client (a test keeps them the same).
// Only what the library list needs: id, deck, name, prereqs.

export type Deck = 'linux' | 'network';
export type ConceptInfo = { id: string; deck: Deck; name: string; prereqs: readonly string[] };

export const DECKS: readonly Deck[] = ['linux', 'network'];

export const CONCEPTS: readonly ConceptInfo[] = [
  { id: 'process', deck: 'linux', name: 'Processes and PIDs', prereqs: [] },
  { id: 'syscall', deck: 'linux', name: 'System calls (user space vs kernel)', prereqs: ['process'] },
  { id: 'thread', deck: 'linux', name: 'Threads vs processes', prereqs: ['process'] },
  { id: 'virtual-memory', deck: 'linux', name: 'Virtual memory and pages', prereqs: ['process'] },
  { id: 'stack-heap', deck: 'linux', name: 'Stack and heap', prereqs: ['virtual-memory'] },
  { id: 'file-descriptor', deck: 'linux', name: 'File descriptors ("everything is a file")', prereqs: ['syscall'] },
  { id: 'permissions', deck: 'linux', name: 'Users, groups and file permissions', prereqs: ['process'] },
  { id: 'signals', deck: 'linux', name: 'Signals and graceful shutdown', prereqs: ['process'] },
  { id: 'inode-filesystem', deck: 'linux', name: 'Inodes, disks and "no space left"', prereqs: ['file-descriptor'] },
  { id: 'page-cache', deck: 'linux', name: 'Page cache: free vs available memory', prereqs: ['virtual-memory'] },
  { id: 'oom-killer', deck: 'linux', name: 'The OOM killer', prereqs: ['page-cache', 'stack-heap'] },
  { id: 'cgroups-namespaces', deck: 'linux', name: 'cgroups and namespaces (what a container is)', prereqs: ['oom-killer', 'permissions'] },
  { id: 'ip-subnet', deck: 'network', name: 'IP addresses and subnets (CIDR)', prereqs: [] },
  { id: 'ports-sockets', deck: 'network', name: 'Ports and sockets', prereqs: ['ip-subnet', 'file-descriptor'] },
  { id: 'tcp-handshake', deck: 'network', name: 'TCP handshake and reliable delivery', prereqs: ['ports-sockets'] },
  { id: 'tcp-close', deck: 'network', name: 'Closing TCP: FIN, RST and TIME_WAIT', prereqs: ['tcp-handshake'] },
  { id: 'udp', deck: 'network', name: 'UDP and when to use it', prereqs: ['ports-sockets'] },
  { id: 'dns-resolution', deck: 'network', name: 'How DNS resolution works', prereqs: ['udp'] },
  { id: 'dns-ttl', deck: 'network', name: 'DNS caching and TTL', prereqs: ['dns-resolution'] },
  { id: 'http-basics', deck: 'network', name: 'HTTP: requests, status codes, keep-alive', prereqs: ['tcp-handshake'] },
  { id: 'tls-handshake', deck: 'network', name: 'TLS handshake and certificates', prereqs: ['tcp-handshake'] },
  { id: 'nat', deck: 'network', name: 'NAT and private networks', prereqs: ['ip-subnet'] },
  { id: 'load-balancing', deck: 'network', name: 'L4 vs L7 load balancing', prereqs: ['http-basics'] },
  { id: 'reverse-proxy', deck: 'network', name: 'Reverse proxies and timeouts (502, 504)', prereqs: ['load-balancing'] },
];
