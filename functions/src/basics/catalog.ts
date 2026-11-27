// Basics (PLAN-basics.md 1): the foundations to learn, in order, with the concepts each one needs first.
// Pure file: the root test suite imports it. The client keeps a light copy in src/lib/basics-catalog.ts.

export type Deck = 'linux' | 'network';
export type Concept = {
  id: string;
  deck: Deck;
  name: string;
  /** Concept ids to learn first. */
  prereqs: readonly string[];
  /** For the model: what the lesson must make clear. */
  focus: string;
};

/** Decks in learning order: closest to DevOps work first. */
export const DECKS: readonly Deck[] = ['linux', 'network'];

export const CONCEPTS: readonly Concept[] = [
  // ---------------------------------------------------------------- linux
  { id: 'process', deck: 'linux', name: 'Processes and PIDs', prereqs: [], focus: 'A process is a running program with its own memory and a PID; parent and child; ps and top.' },
  { id: 'syscall', deck: 'linux', name: 'System calls (user space vs kernel)', prereqs: ['process'], focus: 'Programs ask the kernel to do work (open a file, send data) through system calls; strace shows them.' },
  { id: 'thread', deck: 'linux', name: 'Threads vs processes', prereqs: ['process'], focus: 'Threads share the memory of one process; processes do not; why a crash or a lock affects all threads.' },
  { id: 'virtual-memory', deck: 'linux', name: 'Virtual memory and pages', prereqs: ['process'], focus: 'Each process sees its own address space made of pages; RSS vs virtual size; page faults.' },
  { id: 'stack-heap', deck: 'linux', name: 'Stack and heap', prereqs: ['virtual-memory'], focus: 'Stack for function calls, heap for data that lives longer; how each grows; stack overflow vs out of memory.' },
  { id: 'file-descriptor', deck: 'linux', name: 'File descriptors ("everything is a file")', prereqs: ['syscall'], focus: 'Open files, sockets and pipes are numbers in a per-process table; ulimit -n; "too many open files".' },
  { id: 'permissions', deck: 'linux', name: 'Users, groups and file permissions', prereqs: ['process'], focus: 'rwx for user, group, others; a process runs as a user; root; why containers should not run as root.' },
  { id: 'signals', deck: 'linux', name: 'Signals and graceful shutdown', prereqs: ['process'], focus: 'SIGTERM asks a process to stop, SIGKILL forces it; how Kubernetes stops a pod and why handling SIGTERM matters.' },
  { id: 'inode-filesystem', deck: 'linux', name: 'Inodes, disks and "no space left"', prereqs: ['file-descriptor'], focus: 'Files are inodes plus data blocks; df vs df -i; a deleted file still held open keeps using space.' },
  { id: 'page-cache', deck: 'linux', name: 'Page cache: free vs available memory', prereqs: ['virtual-memory'], focus: 'Linux uses spare memory to cache files; free looks low but available is what matters; reading free -h.' },
  { id: 'oom-killer', deck: 'linux', name: 'The OOM killer', prereqs: ['page-cache', 'stack-heap'], focus: 'When memory runs out the kernel kills a process; how it picks one; how to see it in dmesg; exit code 137.' },
  { id: 'cgroups-namespaces', deck: 'linux', name: 'cgroups and namespaces (what a container is)', prereqs: ['oom-killer', 'permissions'], focus: 'A container is a process with namespaces (what it can see) and cgroups (what it can use); memory and CPU limits.' },
  // ---------------------------------------------------------------- network
  { id: 'ip-subnet', deck: 'network', name: 'IP addresses and subnets (CIDR)', prereqs: [], focus: 'What an IP address is; reading /24 and /16; private ranges; why two subnets cannot overlap.' },
  { id: 'ports-sockets', deck: 'network', name: 'Ports and sockets', prereqs: ['ip-subnet', 'file-descriptor'], focus: 'A socket is IP + port + protocol; listening vs connected sockets; ss -tlnp; ephemeral ports.' },
  { id: 'tcp-handshake', deck: 'network', name: 'TCP handshake and reliable delivery', prereqs: ['ports-sockets'], focus: 'SYN, SYN-ACK, ACK; sequence numbers and resending lost data; what "connection refused" vs "timeout" means.' },
  { id: 'tcp-close', deck: 'network', name: 'Closing TCP: FIN, RST and TIME_WAIT', prereqs: ['tcp-handshake'], focus: 'Normal close with FIN, abrupt close with RST; why TIME_WAIT exists and when many of them become a problem.' },
  { id: 'udp', deck: 'network', name: 'UDP and when to use it', prereqs: ['ports-sockets'], focus: 'No connection and no resend; fast and simple; used by DNS and streaming; what that means for lost packets.' },
  { id: 'dns-resolution', deck: 'network', name: 'How DNS resolution works', prereqs: ['udp'], focus: 'Stub resolver, recursive resolver, root, TLD, authoritative server; dig +trace; A, CNAME and NS records.' },
  { id: 'dns-ttl', deck: 'network', name: 'DNS caching and TTL', prereqs: ['dns-resolution'], focus: 'Every layer caches answers for the TTL; why a DNS change seems slow; lowering the TTL before a migration.' },
  { id: 'http-basics', deck: 'network', name: 'HTTP: requests, status codes, keep-alive', prereqs: ['tcp-handshake'], focus: 'Method, path, headers, body; 2xx/3xx/4xx/5xx; reusing one TCP connection for many requests.' },
  { id: 'tls-handshake', deck: 'network', name: 'TLS handshake and certificates', prereqs: ['tcp-handshake'], focus: 'Agreeing on keys, the server certificate and the chain of trust; SNI; what an expired or wrong certificate does.' },
  { id: 'nat', deck: 'network', name: 'NAT and private networks', prereqs: ['ip-subnet'], focus: 'Private hosts share a public IP through NAT; the translation table; port exhaustion on a NAT gateway.' },
  { id: 'load-balancing', deck: 'network', name: 'L4 vs L7 load balancing', prereqs: ['http-basics'], focus: 'L4 spreads TCP connections, L7 reads HTTP and can route by path or header; health checks; sticky sessions.' },
  { id: 'reverse-proxy', deck: 'network', name: 'Reverse proxies and timeouts (502, 504)', prereqs: ['load-balancing'], focus: 'A proxy in front of apps; 502 when the upstream answers badly or closes, 504 when it is too slow; timeouts on each hop.' },
];

const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

export function conceptOf(id: string): Concept | undefined {
  return BY_ID.get(id);
}

export function isConceptId(id: unknown): id is string {
  return typeof id === 'string' && BY_ID.has(id);
}
