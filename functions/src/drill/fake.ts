// Canned model answers for the emulator when there is no Gemini key
// (NAVI_FAKE_AI=1). They go through the same parsers as real answers, so the
// whole flow can be tested in the browser without spending credit.

import type { DrillLevel, DrillType } from './catalog.ts';

const choice = (prompt: string, options: string[], hint = '') => ({ prompt, kind: 'choice', options, hint });

export function fakeStart(type: DrillType, level: DrillLevel): string {
  const easy = level === 'easy';
  if (type === 'security-review') {
    return JSON.stringify({
      topic: 'S3 bucket policy',
      clock: '10:15',
      brief:
        'A teammate asks you to review this Terraform before it goes to production.\n\n```hcl\nresource "aws_s3_bucket_policy" "reports" {\n  bucket = aws_s3_bucket.reports.id\n  policy = jsonencode({\n    Statement = [{\n      Effect    = "Allow"\n      Principal = "*"\n      Action    = "s3:*"\n      Resource  = "${aws_s3_bucket.reports.arn}/*"\n    }]\n  })\n}\n```\n\nThe bucket holds daily payment reports.',
      truth: 'The policy allows anyone (Principal "*") to do every S3 action. There is no condition and no encryption rule.',
      seniorPath: '1. Block the merge. 2. Limit the principal to one role. 3. Allow only s3:GetObject. 4. Turn on Block Public Access. 5. Add a policy-as-code check in CI.',
      rubric: 'triage: sees public access to payment data as critical. hypothesis: finds all 3 problems. safety: blocks the merge. prevention: adds a CI check.',
      outline: ['Find the worst problem (choice)', 'Fix the policy (text)', 'Explain risk to the team (message)', 'Stop it next time (choice)'],
      round: easy
        ? choice('What is the worst problem?', ['Principal "*" makes the bucket public', 'The resource name is too long', 'jsonencode is slow', 'The bucket has no tags'], 'Who can use this policy?')
        : { prompt: 'List the problems you see, worst first.', kind: 'text', options: [], hint: '' },
    });
  }
  return JSON.stringify({
    topic: 'DB connection pool is full',
    clock: '02:04',
    brief:
      'It is 02:04. An alert fires: payment success rate fell from 99.5% to 92% in 10 minutes.\nThe API logs show many "timeout calling core banking" errors.\nThere was a deploy at 23:00 last night.',
    truth: 'The 23:00 deploy cut the DB connection pool from 50 to 10. Under night batch load, requests wait for a connection and time out.',
    seniorPath: '1. Check dashboards for impact and where the errors start. 2. Post a short status in the incident channel. 3. Compare with the 23:00 deploy. 4. Roll back the config. 5. Check for stuck or double payments. 6. Add an alert on pool usage.',
    rubric: 'triage: checks impact first. hypothesis: links timeouts to the deploy and the DB. safety: checks double payments. comms: posts updates. prevention: alert on pool usage.',
    outline: ['First step (choice)', 'Form guesses (text)', 'Status update (message)', 'Prevent it (choice)'],
    round: choice(
      'What do you do first?',
      ['Roll back the 23:00 deploy now', 'Open the dashboard and see where errors start', 'Call the core banking team', 'Restart all API pods'],
      easy ? 'Know the impact before you change anything.' : '',
    ),
  });
}

export function fakeAnswer(roundNo: number, level: DrillLevel): string {
  const easy = level === 'easy';
  const rounds = [
    easy
      ? choice('The dashboard shows DB latency is 5x higher. What do you check next?', ['DB connection pool usage', 'CPU of the load balancer', 'DNS records', 'The CDN cache'], 'Timeouts often mean waiting for something.')
      : { prompt: 'The dashboard shows DB latency is 5x higher. Write 2-3 guesses about the cause.', kind: 'text', options: [], hint: '' },
    easy
      ? choice('Pool usage is 100%. The 23:00 deploy changed the pool size. What next?', ['Roll back the config change', 'Add more API pods', 'Wait for the batch to end', 'Increase the DB instance size'], 'What changed recently?')
      : { prompt: 'Write a 3-line update for the incident channel.', kind: 'message', options: [], hint: '' },
    { prompt: 'The rollback worked. Success rate is back to 99.4%. How do you stop this next time?', kind: 'text', options: [], hint: '' },
  ];
  return JSON.stringify({
    reveal: ['You see DB latency is 5 times higher than normal.', 'Connection pool usage is at 100% since 01:40.', 'You roll back. In 4 minutes the success rate goes up.'][roundNo - 1] ?? 'Things move on.',
    round: rounds[Math.min(roundNo - 1, rounds.length - 1)],
  });
}

export function fakeFinish(): string {
  return JSON.stringify({
    scores: { triage: 2, hypothesis: 2, safety: 1, comms: 1, prevention: 2 },
    debrief:
      'The real cause was a smaller DB connection pool from the 23:00 deploy. You checked the dashboard before acting. That was good. You found the pool problem fast. You did not check for double payments. You also did not tell the team early.',
    seniorPath: '1. Check impact on the dashboard.\n2. Post a status in the incident channel.\n3. Compare with the last deploy.\n4. Roll back the config.\n5. Check for stuck or double payments.\n6. Add an alert on pool usage.',
    whatIf: [
      { question: 'What if the rollback failed?', answer: 'Raise the pool size by hand as a hot fix. Tell the team first. Then find why the rollback failed.' },
      { question: 'What if some customers paid twice?', answer: 'Stop and list the affected payments. Work with the payments team to refund. Write it in the postmortem.' },
    ],
    mistakes: [
      { text: 'You did not check for double payments.', lesson: 'After a payment incident, always check for stuck or double transactions.' },
      { text: 'You did not post a status update early.', lesson: 'Post a short update in the first 10 minutes, even if you do not know the cause.' },
    ],
    newTerms: [
      { name: 'connection pool', area: 'Data', oneLine: 'A set of open database links that requests share.' },
      { name: 'rollback', area: 'Delivery', oneLine: 'Going back to the last working version.' },
      { name: 'success rate', area: 'Reliability', oneLine: 'The share of requests that work.' },
      { name: 'incident channel', area: 'Communication', oneLine: 'One chat room where everyone follows an outage.' },
    ],
  });
}
