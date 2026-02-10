---
source: https://docs.acme.com/getting-started
fetched_at: '2025-06-01T10:00:00Z'
platform: mintlify
title: Getting Started
docmunch_version: 0.2.0
---

# Getting Started

Welcome to the Acme API documentation. This guide will help you set up your account and make your first API call.

## Installation

```bash
npm install acme-sdk
```

## Quick Start

```javascript
import { Acme } from 'acme-sdk';

const client = new Acme({ apiKey: 'your-key' });
const result = await client.ping();
```
