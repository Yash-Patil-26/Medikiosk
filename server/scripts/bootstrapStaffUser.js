import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { StringDecoder } from 'node:string_decoder';
import pool from '../src/config/db.js';

function ask(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  return rl.question(question).finally(() => rl.close());
}

function askSecret(question) {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('An interactive terminal is required for hidden password entry.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    let finished = false;
    const decoder = new StringDecoder('utf8');

    const cleanup = (error) => {
      if (finished) return;
      finished = true;
      stdin.removeListener('data', onData);

      try {
        if (stdin.isTTY && stdin.isRaw) stdin.setRawMode(false);
      } finally {
        stdin.pause();
        stdout.write('\n');
      }

      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk) => {
      for (const char of decoder.write(chunk)) {
        if (char === '\u0003') {
          cleanup(new Error('Password entry cancelled.'));
          return;
        }

        if (char === '\r' || char === '\n') {
          cleanup();
          return;
        }

        if (char === '\u007f' || char === '\b') {
          const chars = Array.from(value);
          if (chars.length > 0) {
            chars.pop();
            value = chars.join('');
            stdout.write('\b \b');
          }
          continue;
        }

        // Restrict hidden password entry to printable ASCII to keep terminal
        // character handling predictable across Windows and Unix terminals.
        if (char >= ' ' && char <= '~') {
          value += char;
          stdout.write('*');
        }
      }
    };

    stdout.write(question);
    try {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on('data', onData);
    } catch (error) {
      cleanup(error);
    }
  });
}

function validatePassword(password, username) {
  if (password.length < 16) {
    throw new Error('Password must contain at least 16 characters.');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Password must not exceed 72 bytes for bcrypt compatibility.');
  }

  const categories = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;

  if (categories < 3) {
    throw new Error('Password must include at least three of: lowercase, uppercase, digits, symbols.');
  }
  if (password.toLowerCase().includes(username.toLowerCase())) {
    throw new Error('Password must not contain the username.');
  }
}

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('This command is restricted to NODE_ENV=production.');
  }

  const configuredDatabase = String(process.env.DB_NAME || '').trim();
  if (!configuredDatabase) {
    throw new Error('DB_NAME must be configured for the intended hosted database.');
  }
  if (configuredDatabase.toLowerCase().endsWith('_test')) {
    throw new Error('Refusing to bootstrap a staff account in a database ending in _test.');
  }

  let connection;

  try {
    connection = await pool.getConnection();

    const [databaseRows] = await connection.query('SELECT DATABASE() AS databaseName');
    const actualDatabase = databaseRows[0]?.databaseName;

    if (!actualDatabase || actualDatabase !== configuredDatabase) {
      throw new Error('Connected database does not match DB_NAME. No account created.');
    }

    stdout.write(`Connected database: ${actualDatabase}\n`);
    const confirmation = (await ask('Type the exact database name to confirm the target: ')).trim();

    if (confirmation !== actualDatabase) {
      throw new Error('Database confirmation did not match. No account created.');
    }

    const username = (await ask('New staff username (3-100 letters/digits/._-): '))
      .trim()
      .toLowerCase();

    if (!/^[a-z0-9._-]{3,100}$/.test(username)) {
      throw new Error('Username must be 3-100 characters using only letters, digits, dot, underscore, or hyphen.');
    }

    const role = (await ask('Role (doctor, triage, admin): ')).trim().toLowerCase();
    if (!['doctor', 'triage', 'admin'].includes(role)) {
      throw new Error('Role must be doctor, triage, or admin.');
    }

    const [existingRows] = await connection.execute(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (existingRows.length > 0) {
      throw new Error('That username already exists. This command never overwrites existing users.');
    }

    const displayInput = (await ask(`Display name (press Enter for ${username}): `)).trim();
    const displayName = displayInput || username;
    if (displayName.length > 150) {
      throw new Error('Display name must not exceed 150 characters.');
    }

    const password = await askSecret('New password (hidden): ');
    const passwordConfirmation = await askSecret('Confirm password (hidden): ');

    if (password !== passwordConfirmation) {
      throw new Error('Passwords do not match.');
    }
    validatePassword(password, username);

    const passwordHash = await bcrypt.hash(password, 12);
    let transactionOpen = false;

    try {
      await connection.beginTransaction();
      transactionOpen = true;

      // Recheck inside the transaction; the unique username constraint also
      // protects against a concurrent creation attempt.
      const [lockedRows] = await connection.execute(
        'SELECT id FROM users WHERE username = ? LIMIT 1 FOR UPDATE',
        [username]
      );
      if (lockedRows.length > 0) {
        throw new Error('That username was created concurrently. No account was overwritten.');
      }

      const [userResult] = await connection.execute(
        'INSERT INTO users (role, username, password_hash, display_name) VALUES (?, ?, ?, ?)',
        [role, username, passwordHash, displayName]
      );

      await connection.execute(
        `INSERT INTO audit_logs
         (actor_role, actor_id, action, resource_type, resource_id, metadata_json)
         VALUES (?, NULL, ?, ?, ?, ?)`,
        [
          'SYSTEM_BOOTSTRAP',
          'STAFF_ACCOUNT_BOOTSTRAPPED',
          'user',
          String(userResult.insertId),
          JSON.stringify({
            username,
            assigned_role: role,
            bootstrap_method: 'one_time_cli',
            target_database: actualDatabase
          })
        ]
      );

      await connection.commit();
      transactionOpen = false;

      stdout.write(`Created staff account "${username}" with role "${role}".\n`);
      stdout.write('The password was not displayed or logged. Store it securely.\n');
    } catch (error) {
      if (transactionOpen) await connection.rollback();
      throw error;
    }
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Staff bootstrap failed: ${error.message}`);
  process.exitCode = 1;
});