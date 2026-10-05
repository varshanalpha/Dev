require('dotenv').config();
const bcrypt = require('bcryptjs');
const { execute, queryOne } = require('../config/db');

async function seed() {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (in reverse dependency order)
    execute('DELETE FROM comments;');
    execute('DELETE FROM posts;');
    execute('DELETE FROM users;');
    execute("DELETE FROM sqlite_sequence WHERE name IN ('users', 'posts', 'comments');");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Create Users
    const users = [
        {
            username: 'alex_chen',
            email: 'alex@example.com',
            bio: 'Principal Distributed Systems Engineer & Open Source Contributor. Passionate about high-throughput architectures and developer tooling.',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
        },
        {
            username: 'sarah_dev',
            email: 'sarah@example.com',
            bio: 'Senior Frontend Architect & UI/UX enthusiast. Crafting fluid web experiences and exploring modern CSS capabilities.',
            avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80'
        },
        {
            username: 'marcus_ai',
            email: 'marcus@example.com',
            bio: 'ML Systems Researcher. Writing about foundation models, latency reduction, and deploying LLMs to edge devices.',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80'
        }
    ];

    const userIds = {};
    for (const u of users) {
        const res = execute(
            `INSERT INTO users (username, email, password_hash, bio, avatar_url)
             VALUES (?, ?, ?, ?, ?)`,
            [u.username, u.email, passwordHash, u.bio, u.avatar]
        );
        userIds[u.username] = Number(res.lastInsertRowid);
    }
    console.log(`✓ Seeded ${users.length} demo users (all with password: password123)`);

    // 2. Create Posts
    const posts = [
        {
            title: 'Architecting Resilient Event-Driven Microservices in 2026',
            slug: 'architecting-resilient-event-driven-microservices-2026',
            category: 'Engineering',
            cover_image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&h=600&q=80',
            author_id: userIds['alex_chen'],
            excerpt: 'Deep-dive into event sourcing, idempotency keys, dead-letter queues, and avoiding distributed transactions across heterogeneous cloud services.',
            reading_time: 6,
            content: `Building microservices at scale requires rethinking traditional synchronous HTTP communication. When dozens of independent services communicate over the wire, network latency spikes, temporary outages, and database locks quickly cascade into catastrophic failures.

### The Problem With Synchronous Cascades
In a traditional REST architecture, Service A calls Service B, which synchronously awaits responses from Service C and Service D. If Service C experiences a latency bump of 800ms, every upstream thread is kept waiting. Soon your connection pools exhaust, memory consumption shoots through the roof, and the entire platform slows to a crawl.

### The Event-Driven Antidote
Instead of blocking calls, event-driven architectures publish domain events representing facts that have already happened:
- \`OrderPlaced\`
- \`PaymentCaptured\`
- \`InventoryReserved\`

Subscribers react asynchronously. By decoupling producers from consumers, systems gain immense fault tolerance and horizontal scalability.

### Essential Tenets for Production:
1. **Idempotency is Non-Negotiable**: Every consumer must withstand duplicate event deliveries without side effects. Store idempotency tokens in a fast distributed cache like Redis or SQLite with unique constraints.
2. **Outbox Pattern**: Never publish to a message broker and write to your database in uncoordinated steps. Use transactional outbox tables to guarantee at-least-once delivery.
3. **Dead Letter Queues with Automated Retries**: Exponential backoff with jitter prevents thundering herd problems when downstream dependencies recover.

Embrace event boundaries, respect eventual consistency, and design your schemas for evolution from day one.`
        },
        {
            title: 'Modern CSS in 2026: Goodbye Preprocessors, Hello Native Power',
            slug: 'modern-css-in-2026-native-power',
            category: 'Design',
            cover_image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&h=600&q=80',
            author_id: userIds['sarah_dev'],
            excerpt: 'Native CSS nesting, container queries, subgrid, and cascade layers have radically changed frontend engineering. Here is why vanilla CSS is now elite.',
            reading_time: 4,
            content: `For over a decade, frontend teams considered preprocessors like SASS, Less, or heavy CSS-in-JS abstractions mandatory for scalable stylesheets. Today, the native web platform has not only caught up—it has surpassed them in elegance, runtime performance, and maintainability.

### 1. Native Nesting
Browsers now natively support syntax nesting without requiring a compilation step:
\`\`\`css
.card {
  background: var(--bg-surface);
  border-radius: 16px;
  
  & .card-header {
    font-weight: 600;
  }

  &:hover {
    transform: translateY(-4px);
  }
}
\`\`\`

### 2. Container Queries
Media queries only know about viewport dimensions. But a reusable component lives inside sidebars, grids, or full-width layouts. Container queries (\`@container\`) allow components to style themselves relative to their immediate parent container's dimensions.

### 3. Cascade Layers (\`@layer\`)
CSS specificity wars are finally solved. By defining architectural layers:
- \`@layer reset, base, components, utilities;\`
You ensure that utility overrides always take precedence over base definitions regardless of declaration order.

Writing pure, uncompiled CSS today provides instant browser refresh speeds and zero runtime library overhead.`
        },
        {
            title: 'Optimizing Token Latency: Quantization and Speculative Decoding',
            slug: 'optimizing-token-latency-speculative-decoding',
            category: 'AI',
            cover_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=600&q=80',
            author_id: userIds['marcus_ai'],
            excerpt: 'How draft models, KV caching tricks, and 4-bit AWQ quantization enable real-time generative interfaces with sub-15ms time-to-first-token.',
            reading_time: 5,
            content: `Autoregressive generative models face a fundamental physics bottleneck: token generation is memory-bandwidth bound rather than compute bound. For every single output token generated, weights for billions of parameters must be streamed from VRAM into the compute cores.

### The Speculative Decoding Breakthrough
Speculative decoding tackles this by pairing a large target model (e.g. 70B parameter model) with a lightweight, ultra-fast draft model (e.g. 1B parameter model).

1. The draft model predicts a sequence of 5 tokens in parallel at hyper-speed.
2. The large target model evaluates all 5 candidate tokens simultaneously in a single forward pass.
3. If the target model agrees with the draft tokens, multiple tokens are accepted in the latency time of just one token!

### Quantization Without Quality Degradation
Techniques like AWQ (Activation-aware Weight Quantization) recognize that not all weights are created equal. By protecting the top 1% of salient weight channels while compressing the remaining 99% to 4 bits, models retain near-FP16 perplexity while reducing memory footprint by over 60%.

The future of production AI is not just bigger parameters—it is relentless inference engineering.`
        }
    ];

    const postIds = {};
    for (const p of posts) {
        const res = execute(
            `INSERT INTO posts (title, slug, content, excerpt, category, cover_image, reading_time, author_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.title, p.slug, p.content, p.excerpt, p.category, p.cover_image, p.reading_time, p.author_id]
        );
        postIds[p.slug] = Number(res.lastInsertRowid);
    }
    console.log(`✓ Seeded ${posts.length} rich blog posts`);

    // 3. Create Comments
    const comments = [
        {
            post_id: postIds['architecting-resilient-event-driven-microservices-2026'],
            author_id: userIds['sarah_dev'],
            content: 'The transactional outbox pattern saved our billing pipeline last quarter when our Kafka broker had an unexpected split-brain scenario. Excellent breakdown Alex!'
        },
        {
            post_id: postIds['architecting-resilient-event-driven-microservices-2026'],
            author_id: userIds['marcus_ai'],
            content: 'Spot on regarding idempotency. We treat idempotency keys as first-class citizens in our API gateway layer now.'
        },
        {
            post_id: postIds['modern-css-in-2026-native-power'],
            author_id: userIds['alex_chen'],
            content: 'Container queries have completely replaced our hacky resize observer hooks. The developer ergonomics are simply unmatched.'
        },
        {
            post_id: postIds['optimizing-token-latency-speculative-decoding'],
            author_id: userIds['sarah_dev'],
            content: 'Sub-15ms TTFT makes generative search feel like instant typeahead. Fascinating write-up on speculative decoding!'
        }
    ];

    for (const c of comments) {
        execute(
            `INSERT INTO comments (post_id, author_id, content)
             VALUES (?, ?, ?)`,
            [c.post_id, c.author_id, c.content]
        );
    }
    console.log(`✓ Seeded ${comments.length} engaging discussion comments`);
    console.log('🎉 Seeding completed successfully!');
}

seed()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Seeding error:', err);
        process.exit(1);
    });
