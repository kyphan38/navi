// Basics (PLAN-basics.md 1): the foundations to learn, in order, with the concepts each one needs first.
// Pure file: the root test suite imports it. The client keeps a light copy in src/lib/basics-catalog.ts.

export type Deck = 'linux' | 'network' | 'data' | 'runtime' | 'distributed' | 'delivery';
export type Concept = {
  id: string;
  deck: Deck;
  name: string;
  /** Skill ids (SKILL_CATALOG) this concept supports: links to your work, and lab evidence. */
  skills: readonly string[];
  /** Concept ids to learn first. */
  prereqs: readonly string[];
  /** For the model: what the lesson must make clear. */
  focus: string;
};

/** Decks in learning order: closest to DevOps work first. */
export const DECKS: readonly Deck[] = ['linux', 'network', 'data', 'runtime', 'distributed', 'delivery'];

export const CONCEPTS: readonly Concept[] = [
  // ---------------------------------------------------------------- linux
  { id: 'process', deck: 'linux', name: 'Processes and PIDs', skills: ['linux-perf'], prereqs: [], focus: 'A process is a running program with its own memory and a PID; parent and child; ps and top.' },
  { id: 'syscall', deck: 'linux', name: 'System calls (user space vs kernel)', skills: ['linux-perf'], prereqs: ['process'], focus: 'Programs ask the kernel to do work (open a file, send data) through system calls; strace shows them.' },
  { id: 'thread', deck: 'linux', name: 'Threads vs processes', skills: ['linux-perf'], prereqs: ['process'], focus: 'Threads share the memory of one process; processes do not; why a crash or a lock affects all threads.' },
  { id: 'virtual-memory', deck: 'linux', name: 'Virtual memory and pages', skills: ['linux-perf'], prereqs: ['process'], focus: 'Each process sees its own address space made of pages; RSS vs virtual size; page faults.' },
  { id: 'stack-heap', deck: 'linux', name: 'Stack and heap', skills: ['linux-perf'], prereqs: ['virtual-memory'], focus: 'Stack for function calls, heap for data that lives longer; how each grows; stack overflow vs out of memory.' },
  { id: 'file-descriptor', deck: 'linux', name: 'File descriptors ("everything is a file")', skills: ['linux-perf'], prereqs: ['syscall'], focus: 'Open files, sockets and pipes are numbers in a per-process table; ulimit -n; "too many open files".' },
  { id: 'permissions', deck: 'linux', name: 'Users, groups and file permissions', skills: ['containers'], prereqs: ['process'], focus: 'rwx for user, group, others; a process runs as a user; root; why containers should not run as root.' },
  { id: 'signals', deck: 'linux', name: 'Signals and graceful shutdown', skills: ['containers', 'k8s-core'], prereqs: ['process'], focus: 'SIGTERM asks a process to stop, SIGKILL forces it; how Kubernetes stops a pod and why handling SIGTERM matters.' },
  { id: 'inode-filesystem', deck: 'linux', name: 'Inodes, disks and "no space left"', skills: ['linux-perf'], prereqs: ['file-descriptor'], focus: 'Files are inodes plus data blocks; df vs df -i; a deleted file still held open keeps using space.' },
  { id: 'page-cache', deck: 'linux', name: 'Page cache: free vs available memory', skills: ['linux-perf'], prereqs: ['virtual-memory'], focus: 'Linux uses spare memory to cache files; free looks low but available is what matters; reading free -h.' },
  { id: 'oom-killer', deck: 'linux', name: 'The OOM killer', skills: ['linux-perf', 'containers'], prereqs: ['page-cache', 'stack-heap'], focus: 'When memory runs out the kernel kills a process; how it picks one; how to see it in dmesg; exit code 137.' },
  { id: 'cgroups-namespaces', deck: 'linux', name: 'cgroups and namespaces (what a container is)', skills: ['containers', 'k8s-core'], prereqs: ['oom-killer', 'permissions'], focus: 'A container is a process with namespaces (what it can see) and cgroups (what it can use); memory and CPU limits.' },
  // ---------------------------------------------------------------- network
  { id: 'ip-subnet', deck: 'network', name: 'IP addresses and subnets (CIDR)', skills: ['vpc'], prereqs: [], focus: 'What an IP address is; reading /24 and /16; private ranges; why two subnets cannot overlap.' },
  { id: 'ports-sockets', deck: 'network', name: 'Ports and sockets', skills: ['vpc', 'linux-perf'], prereqs: ['ip-subnet', 'file-descriptor'], focus: 'A socket is IP + port + protocol; listening vs connected sockets; ss -tlnp; ephemeral ports.' },
  { id: 'tcp-handshake', deck: 'network', name: 'TCP handshake and reliable delivery', skills: ['load-balancers'], prereqs: ['ports-sockets'], focus: 'SYN, SYN-ACK, ACK; sequence numbers and resending lost data; what "connection refused" vs "timeout" means.' },
  { id: 'tcp-close', deck: 'network', name: 'Closing TCP: FIN, RST and TIME_WAIT', skills: ['load-balancers'], prereqs: ['tcp-handshake'], focus: 'Normal close with FIN, abrupt close with RST; why TIME_WAIT exists and when many of them become a problem.' },
  { id: 'udp', deck: 'network', name: 'UDP and when to use it', skills: ['dns'], prereqs: ['ports-sockets'], focus: 'No connection and no resend; fast and simple; used by DNS and streaming; what that means for lost packets.' },
  { id: 'dns-resolution', deck: 'network', name: 'How DNS resolution works', skills: ['dns'], prereqs: ['udp'], focus: 'Stub resolver, recursive resolver, root, TLD, authoritative server; dig +trace; A, CNAME and NS records.' },
  { id: 'dns-ttl', deck: 'network', name: 'DNS caching and TTL', skills: ['dns'], prereqs: ['dns-resolution'], focus: 'Every layer caches answers for the TTL; why a DNS change seems slow; lowering the TTL before a migration.' },
  { id: 'http-basics', deck: 'network', name: 'HTTP: requests, status codes, keep-alive', skills: ['load-balancers'], prereqs: ['tcp-handshake'], focus: 'Method, path, headers, body; 2xx/3xx/4xx/5xx; reusing one TCP connection for many requests.' },
  { id: 'tls-handshake', deck: 'network', name: 'TLS handshake and certificates', skills: ['tls'], prereqs: ['tcp-handshake'], focus: 'Agreeing on keys, the server certificate and the chain of trust; SNI; what an expired or wrong certificate does.' },
  { id: 'nat', deck: 'network', name: 'NAT and private networks', skills: ['vpc'], prereqs: ['ip-subnet'], focus: 'Private hosts share a public IP through NAT; the translation table; port exhaustion on a NAT gateway.' },
  { id: 'load-balancing', deck: 'network', name: 'L4 vs L7 load balancing', skills: ['load-balancers', 'k8s-networking'], prereqs: ['http-basics'], focus: 'L4 spreads TCP connections, L7 reads HTTP and can route by path or header; health checks; sticky sessions.' },
  { id: 'reverse-proxy', deck: 'network', name: 'Reverse proxies and timeouts (502, 504)', skills: ['load-balancers'], prereqs: ['load-balancing'], focus: 'A proxy in front of apps; 502 when the upstream answers badly or closes, 504 when it is too slow; timeouts on each hop.' },
  // ---------------------------------------------------------------- data
  { id: 'db-index', deck: 'data', name: 'Indexes (B-tree) and slow queries', skills: ['databases'], prereqs: [], focus: 'An index is a sorted structure that finds rows without reading the whole table; why a missing index makes a query slow; EXPLAIN.' },
  { id: 'db-transaction', deck: 'data', name: 'Transactions and ACID', skills: ['databases', 'payment-flows'], prereqs: [], focus: 'A transaction is all or nothing; what atomic, consistent, isolated and durable mean in practice; commit and rollback.' },
  { id: 'db-isolation', deck: 'data', name: 'Isolation levels and race conditions', skills: ['databases'], prereqs: ['db-transaction'], focus: "Two transactions at the same time can see each other's changes or not; read committed vs repeatable read vs serializable; lost updates." },
  { id: 'db-locks', deck: 'data', name: 'Locks and deadlocks in a database', skills: ['databases'], prereqs: ['db-isolation'], focus: 'Row and table locks; why a long transaction blocks others; how the database breaks a deadlock.' },
  { id: 'db-connection-pool', deck: 'data', name: 'Connection pools', skills: ['databases', 'scaling'], prereqs: ['db-transaction', 'tcp-handshake'], focus: 'Opening a connection is slow, so apps reuse a pool; pool size vs database max connections; what "pool exhausted" looks like.' },
  { id: 'db-replication', deck: 'data', name: 'Replication and replica lag', skills: ['databases', 'backup-dr'], prereqs: ['db-transaction'], focus: 'A primary copies changes to replicas; reads from a replica can be old; failover and why lag matters.' },
  { id: 'db-backup', deck: 'data', name: 'Backups, restore and point-in-time recovery', skills: ['backup-dr', 'databases'], prereqs: ['db-replication'], focus: 'A replica is not a backup; full backups plus logs to restore to a moment; a backup you never restored may not work.' },
  { id: 'db-sharding', deck: 'data', name: 'Partitioning and sharding', skills: ['databases', 'scaling'], prereqs: ['db-replication'], focus: 'Splitting data across tables or servers by a key; hot shards; why cross-shard queries are hard.' },
  { id: 'cache', deck: 'data', name: 'Caching: hit rate, TTL and invalidation', skills: ['databases', 'scaling'], prereqs: [], focus: 'A cache keeps hot data close; hit rate; TTL; stale data; what happens when the cache is empty (thundering herd).' },
  { id: 'db-migration', deck: 'data', name: 'Schema migrations without downtime', skills: ['databases', 'release-safety'], prereqs: ['db-locks'], focus: 'Changing a table while the app runs: add before remove (expand and contract), long locks on big tables, backfills.' },
  // ---------------------------------------------------------------- runtime
  { id: 'compile-vs-interpret', deck: 'runtime', name: 'Compiled vs interpreted code, and runtimes', skills: [], prereqs: ['process'], focus: 'Go builds a binary; Python and Node run on an interpreter; Java runs on the JVM; what each needs inside a container.' },
  { id: 'gc', deck: 'runtime', name: 'Garbage collection and pauses', skills: ['linux-perf'], prereqs: ['stack-heap'], focus: 'The runtime frees memory nobody uses; GC pauses stop the app for a moment; why heap size and container limits must match.' },
  { id: 'memory-leak', deck: 'runtime', name: 'Memory leaks', skills: ['linux-perf', 'monitoring'], prereqs: ['gc'], focus: 'Memory that is still referenced is never freed; memory that grows until OOM; how to see it on a graph.' },
  { id: 'event-loop', deck: 'runtime', name: 'Event loop vs threads', skills: ['linux-perf'], prereqs: ['thread'], focus: 'One thread with an event loop (Node) vs a thread per request; why one slow task blocks an event loop.' },
  { id: 'blocking-io', deck: 'runtime', name: 'Blocking vs non-blocking I/O', skills: ['linux-perf'], prereqs: ['event-loop', 'file-descriptor'], focus: 'Waiting for disk or network holds a thread; non-blocking I/O lets one thread wait on many sockets (epoll).' },
  { id: 'race-condition', deck: 'runtime', name: 'Race conditions and locks', skills: ['linux-perf'], prereqs: ['thread'], focus: 'Two threads change the same data and the result depends on timing; mutexes; why races hide in tests.' },
  { id: 'deadlock', deck: 'runtime', name: 'Deadlocks', skills: ['linux-perf'], prereqs: ['race-condition'], focus: 'Two parties each hold what the other needs; the app freezes with no errors; lock order.' },
  { id: 'serialization', deck: 'runtime', name: 'Serialization (JSON, protobuf)', skills: [], prereqs: ['http-basics'], focus: 'Turning data into bytes and back; JSON vs protobuf; why a field change can break the other side.' },
  { id: 'env-config', deck: 'runtime', name: 'Config and environment variables', skills: ['secrets', 'containers'], prereqs: ['process'], focus: 'Apps read config from the environment; the same image runs in every environment; what not to put in env vars.' },
  { id: 'exit-codes', deck: 'runtime', name: 'Exit codes and crash loops', skills: ['containers', 'k8s-core'], prereqs: ['signals'], focus: '0 means success; 1, 137 (SIGKILL, often OOM) and 143 (SIGTERM); how restarts turn into CrashLoopBackOff.' },
  // ---------------------------------------------------------------- distributed (with SRE)
  { id: 'latency-percentiles', deck: 'distributed', name: 'Latency and percentiles (p50, p99)', skills: ['monitoring', 'slo'], prereqs: [], focus: 'Averages hide slow requests; p99 means 1 in 100 is slower; why tail latency grows when one call fans out to many.' },
  { id: 'sli-slo', deck: 'distributed', name: 'SLIs, SLOs and error budgets', skills: ['slo'], prereqs: ['latency-percentiles'], focus: 'An SLI measures what users feel; an SLO is the target; the error budget is how much failure is allowed; what to do when it is used up.' },
  { id: 'burn-rate', deck: 'distributed', name: 'Error budget burn rate alerts', skills: ['slo', 'on-call', 'monitoring'], prereqs: ['sli-slo'], focus: 'Alert on how fast the budget burns, over a short and a long window, instead of on every error; fewer false pages.' },
  { id: 'timeouts-retries', deck: 'distributed', name: 'Timeouts, retries and backoff', skills: ['resilience-patterns'], prereqs: ['tcp-handshake'], focus: 'Every call needs a timeout; retries with backoff and jitter; how retries can make an outage worse (retry storm).' },
  { id: 'idempotency', deck: 'distributed', name: 'Idempotency', skills: ['payment-flows', 'resilience-patterns'], prereqs: ['timeouts-retries'], focus: 'Doing the same request twice has the same effect as once; idempotency keys; why payments need it.' },
  { id: 'circuit-breaker', deck: 'distributed', name: 'Circuit breakers and graceful degradation', skills: ['resilience-patterns'], prereqs: ['timeouts-retries'], focus: 'Stop calling a failing dependency for a while; serve a smaller answer instead of failing; open, half-open, closed.' },
  { id: 'queues', deck: 'distributed', name: 'Message queues and back pressure', skills: ['scaling'], prereqs: [], focus: 'A queue lets producers and consumers work at different speeds; at-least-once delivery; what a growing queue tells you.' },
  { id: 'littles-law', deck: 'distributed', name: "Little's law and queueing", skills: ['scaling', 'load-testing'], prereqs: ['queues', 'latency-percentiles'], focus: 'In flight = arrival rate x time in system; why latency explodes near full utilization; using it for capacity.' },
  { id: 'consensus', deck: 'distributed', name: 'Consensus and quorum (Raft, etcd)', skills: ['k8s-core', 'failure-modes'], prereqs: [], focus: 'Nodes agree on one value with a majority; why 3 or 5 nodes; what happens when quorum is lost (etcd, Kubernetes).' },
  { id: 'cap', deck: 'distributed', name: 'CAP and consistency trade-offs', skills: ['failure-modes', 'databases'], prereqs: ['consensus', 'db-replication'], focus: 'During a network split a system must choose: stay available or stay consistent; eventual consistency in practice.' },
  // ---------------------------------------------------------------- delivery
  { id: 'image-layers', deck: 'delivery', name: 'Container images and layers', skills: ['containers'], prereqs: ['cgroups-namespaces'], focus: 'An image is stacked read-only layers; layer cache in builds; why order in a Dockerfile matters; small images.' },
  { id: 'registry-tags', deck: 'delivery', name: 'Registries, tags and digests', skills: ['containers', 'cicd'], prereqs: ['image-layers'], focus: 'A tag can move, a digest cannot; why "latest" is risky; pinning by digest.' },
  { id: 'build-artifact', deck: 'delivery', name: 'Build artifacts and reproducible builds', skills: ['cicd'], prereqs: [], focus: 'Build once, deploy the same artifact everywhere; versioning; why rebuilding per environment is risky.' },
  { id: 'ci-pipeline', deck: 'delivery', name: 'CI pipelines: stages, cache and gates', skills: ['cicd'], prereqs: ['build-artifact'], focus: 'Stages from test to deploy; caching to go fast; gates (tests, scans, approvals) that stop bad changes.' },
  { id: 'iac-state', deck: 'delivery', name: 'IaC state and drift', skills: ['iac'], prereqs: [], focus: 'Terraform keeps state to map code to real resources; locking; drift when someone changes things by hand.' },
  { id: 'deploy-strategies', deck: 'delivery', name: 'Rolling, blue-green and canary deploys', skills: ['release-safety', 'cicd'], prereqs: ['load-balancing'], focus: 'How each moves traffic to the new version; how fast you can roll back; what each costs.' },
  { id: 'feature-flags', deck: 'delivery', name: 'Feature flags', skills: ['release-safety'], prereqs: ['deploy-strategies'], focus: 'Ship code turned off, then turn it on for some users; separate deploy from release; flag debt.' },
  { id: 'metrics-logs-traces', deck: 'delivery', name: 'Metrics, logs and traces', skills: ['observability', 'monitoring'], prereqs: [], focus: 'Metrics are numbers over time, logs are events, traces follow one request across services; when to use which.' },
  { id: 'alerting', deck: 'delivery', name: 'Alerting on symptoms, not causes', skills: ['on-call', 'monitoring'], prereqs: ['metrics-logs-traces', 'sli-slo'], focus: 'Page when users are hurt, not when CPU is high; every page needs an action and a runbook.' },
  { id: 'secrets-handling', deck: 'delivery', name: 'Secrets: where they live and how they leak', skills: ['secrets'], prereqs: ['env-config'], focus: 'Keep secrets in a secret manager, not in code or images; rotation; how secrets leak in logs and build output.' },
];

const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));

export function conceptOf(id: string): Concept | undefined {
  return BY_ID.get(id);
}

export function isConceptId(id: unknown): id is string {
  return typeof id === 'string' && BY_ID.has(id);
}
