## Authentication

## Authorization

### Alternatives Considered

#### Why not just use a `users.role` enum column?

It is fair to ask why not just use a role column on the users table. Something like:

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'clinician', 'research', 'student', 'supervisor', 'fellow')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT sNULL DEFAULT now()
);
```

1. We want to be able to add new roles without having to change the database schema.
2. We want to support multiple roles per user. Research team can put on supervisor hat if needed.
3. We want to be able to add new permissions without having to change the database schema as we accomodate new features.
4. This is too coarse-grained. We want to be able to control access to specific resources, not just the entire application.

#### Using Postgres row-level security and authorization features

Postgres has a robust set of features for authorization and row-level security. We considered using these features to implement authorization. However, we decided against this approach for the following reasons:

1. The application would need to dynamically manage database permissions, elevating the risk of SQL injection attacks.
2. This tightly couples the application to Postgres, making it harder to migrate to another database in the future.
3. The database connection string would have to change based on which user is signed in, which could make it harder to use connection pooling.

### RBAC

RBAC fits with the tiered model of care at Shamiri Institute.

```
Superadmins
└── Implementors (Shamiri, AFRAM, etc.)
    └── Clinicians
    │   ├── Supervisors
    │   │   ├── Fellows
    │   │   │   └── Students
    │   └── Deliver
    └─── Research
```

In code, lets call implementors organizations as that fits more with terms used in SaaS.

### Permissions

#### Permission groups

Permission groups can encoded in the label syntax implementors:read-dashboard

## Data

## Migration flow

To counter the previous workflow of making adhoc changes to Airtable, we need a process to introduce changes that the research team or implementers or superadmins want into the SDH.

### Seeding data

We seed that is crucial for SDH to operate in both development and production environments.

## Object storage

To support [clinician workflows], we will need some kind of object storage anyway. Since SDH is supporting multiple tenants / organizations (i.e. implementers), we started the implementation with supporting organization logos and user avatars (copied over from Google Social Login flow).

[clinician workflows]: https://www.notion.so/shamiri/Supervisor-Requirements-964e7210654845468e24d623f2e75b3d?pvs=4#e6adb7e1e1da4b708b83bc663b2a5a0c
