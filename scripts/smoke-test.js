// Backend smoke test. Runs inside Electron (the SQLite driver is built for Electron's Node ABI)
// against a throw-away data folder, so it never touches real clinic data.
//   npm run build:electron && npx electron scripts/smoke-test.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'clinic-central-test-'));
app.setPath('userData', tmp);
const dist = path.join(__dirname, '..', 'electron-dist');
const load = p => require(path.join(dist, p));

function run() {
  const { runMigrations } = load('database/migrate');
  const { seedDefaults } = load('database/seed');
  const { getDatabase, closeDatabase } = load('database/connection');
  runMigrations();
  seedDefaults();
  const db = getDatabase();
  const count = t => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;

  // Defaults come from the JSON files
  const trees = count('treatment_trees'), treatments = count('treatments');
  assert(trees >= 7 && treatments > 50, 'default treatments seeded from JSON');
  assert(count('medicines') > 15, 'medicines seeded');
  assert(count('consent_templates') >= 5, 'consent templates seeded');

  const tj = load('services/treatment-json');
  const { loadDefaultTreatments } = load('database/seed');
  const again = loadDefaultTreatments();
  assert.strictEqual(again.treatmentsCreated, 0, 're-import creates no duplicates');
  assert.strictEqual(count('treatments'), treatments);
  const exported = tj.exportTreatments();
  const original = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/treatments/default-treatments.json'), 'utf8'));
  const strip = f => JSON.stringify(f.categories.map(c => ({ n: c.name, t: c.treatments })));
  const norm = nodes => nodes.map(n => ({ name: n.name, cost: n.cost, duration: n.duration, ...(n.children ? { children: norm(n.children) } : {}) }));
  assert.strictEqual(strip({ categories: exported.categories.map(c => ({ name: c.name, treatments: norm(c.treatments) })) }),
    strip({ categories: original.categories.map(c => ({ name: c.name, treatments: norm(c.treatments) })) }), 'export round-trips the default JSON');
  assert.throws(() => tj.importTreatmentContent('{"categories":[{"name":"X","treatments":[{"cost":5}]}]}'), /missing a "name"/);
  assert.throws(() => tj.importTreatmentContent('{ not json'), /Not valid JSON/);
  const legacy = tj.importTreatmentContent('TREE: Legacy\n  Parent | 100 | 10\n    Child | 50 | 5\n  Sibling | 20\n');
  assert.deepStrictEqual([legacy.treesCreated, legacy.treatmentsCreated], [1, 3]);
  const child = db.prepare("SELECT t.*, p.name pn FROM treatments t JOIN treatments p ON p.id = t.parent_id WHERE t.name = 'Child'").get();
  assert.strictEqual(child.pn, 'Parent');
  assert.strictEqual(child.estimated_cost_paise, 5000);

  // Patient with new fields + membership
  const { patientService } = load('services/patient.service');
  const { membershipService } = load('services/membership.service');
  const plan = membershipService.save({ name: 'Gold', discount_percent: 10, validity_months: 12 });
  assert.throws(() => membershipService.save({ name: 'Bad', discount_percent: 150 }), /between 0 and 100/);
  const pid = patientService.create({ first_name: 'Test', last_name: 'Patient', phone_primary: '9999999999',
    allergies: 'Penicillin', blood_group: 'O+', membership_plan_id: plan.id, membership_expiry: '2099-01-01' }).id;
  assert.strictEqual(patientService.getById(pid).membership_name, 'Gold');
  assert.strictEqual(membershipService.activeForPatient(pid).discount_percent, 10);
  patientService.update(pid, { membership_expiry: '2000-01-01' });
  assert.strictEqual(membershipService.activeForPatient(pid), null, 'expired membership is not active');
  assert.strictEqual(patientService.list({}).data.length, 1);

  // Queue
  const { appointmentService } = load('services/appointment.service');
  const a1 = appointmentService.create({ patient_id: pid, appointment_date: new Date().toISOString() });
  const w = appointmentService.walkIn({ patient_id: pid });
  assert.strictEqual(w.token_number, 1);
  assert.strictEqual(appointmentService.checkIn(Number(a1.id)).token_number, 2);
  assert.strictEqual(appointmentService.checkIn(Number(a1.id)).token_number, 2, 'check-in is idempotent');
  const q = appointmentService.getQueue();
  assert.deepStrictEqual(q.map(x => x.token_number), [1, 2]);
  assert.strictEqual(appointmentService.getTodaysAppointments().length, 2);

  // Clinical notes, chart
  const { notesService, toothService } = load('services/clinical.service');
  const { localDate } = load('database/helpers');
  const note = notesService.save({ patient_id: pid, visit_date: localDate(), chief_complaint: 'Pain', follow_up_date: localDate() });
  notesService.save({ id: note.id, diagnosis: 'Pulpitis', follow_up_date: null });
  const n = notesService.listByPatient(pid)[0];
  assert.strictEqual(n.diagnosis, 'Pulpitis'); assert.strictEqual(n.follow_up_date, null); assert.strictEqual(n.chief_complaint, 'Pain');
  toothService.setTooth(pid, '36', { condition: 'caries' });
  toothService.setTooth(pid, '36', { condition: 'rct', notes: 'done' });
  assert.deepStrictEqual(toothService.getChart(pid).map(t => [t.tooth_number, t.condition]), [['36', 'rct']]);

  // Treatment plan -> invoice
  const { planService } = load('services/plan.service');
  const p = planService.save({ patient_id: pid, title: 'Full mouth', discount_paise: 50000, items: [
    { stage: 1, description: 'RCT', teeth: '36', quantity: 1, unit_price_paise: 800000 },
    { stage: 2, description: 'Crown', teeth: '36', quantity: 2, unit_price_paise: 600000 },
  ] });
  let full = planService.getById(p.id);
  assert.strictEqual(full.items.length, 2); assert.strictEqual(full.items[1].total_paise, 1200000);
  planService.setItemStatus(full.items[0].id, 'completed');
  assert.strictEqual(planService.getById(p.id).status, 'in_progress');
  const inv = planService.createInvoice(p.id, [full.items[0].id], true);
  const { invoiceService } = load('services/invoice.service');
  const invoice = invoiceService.getById(inv.id);
  assert.strictEqual(invoice.total_paise, 750000); assert.strictEqual(invoice.items[0].description, 'RCT (Tooth 36)');
  assert.throws(() => planService.createInvoice(p.id, [full.items[0].id]), /No un-invoiced/);
  planService.setItemStatus(full.items[1].id, 'completed');
  assert.strictEqual(planService.getById(p.id).status, 'completed');
  full = planService.getById(p.id);
  planService.save({ id: p.id, patient_id: pid, title: 'Full mouth v2', items: [full.items[0]] });
  full = planService.getById(p.id);
  assert.strictEqual(full.items.length, 1); assert.strictEqual(full.items[0].invoice_id, inv.id, 'invoice link survives plan edit');
  assert.strictEqual(planService.list({ patientId: pid })[0].subtotal_paise, 800000);

  // Prescriptions + templates
  const rx = load('services/prescription.service');
  const r = rx.prescriptionService.save({ patient_id: pid, prescription_date: localDate(), diagnosis: 'Abscess',
    items: [{ medicine_name: 'Amoxicillin', strength: '500 mg', frequency: '1-1-1', duration: '5 days' }, { medicine_name: ' ' }] });
  assert.strictEqual(rx.prescriptionService.listByPatient(pid)[0].items.length, 1);
  rx.prescriptionService.save({ id: r.id, patient_id: pid, prescription_date: localDate(), items: [{ medicine_name: 'A' }, { medicine_name: 'B' }] });
  assert.strictEqual(rx.prescriptionService.listByPatient(pid)[0].items.length, 2);
  assert.throws(() => rx.prescriptionService.save({ patient_id: pid, prescription_date: localDate(), items: [] }), /at least one/);
  rx.rxTemplateService.save({ name: 'Post extraction', items: [{ medicine_name: 'Ibuprofen' }] });
  assert.strictEqual(rx.rxTemplateService.list()[0].items[0].medicine_name, 'Ibuprofen');

  // Lab
  const { labService } = load('services/lab.service');
  const lab = labService.saveLab({ name: 'Smile Lab' });
  const lo = labService.saveOrder({ patient_id: pid, lab_id: lab.id, work_type: 'Crown', order_date: localDate(), due_date: localDate(), cost_paise: 150000 });
  assert.strictEqual(labService.dueSoon().length, 1);
  labService.recordExpense(lo.id);
  assert.throws(() => labService.recordExpense(lo.id), /already recorded/);
  labService.setOrderStatus(lo.id, 'received');
  assert.strictEqual(labService.listOrders({ patientId: pid })[0].received_date, localDate());
  assert.strictEqual(labService.dueSoon().length, 0);

  // Consent
  const { consentService } = load('services/consent.service');
  const c = consentService.create({ patient_id: pid, title: 'Extraction', body: 'I agree' });
  assert.throws(() => consentService.sign(c.id, 'Test', 'nope'), /Signature is missing/);
  consentService.sign(c.id, 'Test Patient', 'data:image/png;base64,AAAA');
  assert.throws(() => consentService.sign(c.id, 'X', 'data:image/png;base64,AAAA'), /already been signed/);

  // Inventory
  const { inventoryService } = load('services/inventory.service');
  const item = inventoryService.save({ name: 'Gloves', unit: 'box', reorder_level: 5, opening_quantity: 6 });
  inventoryService.addMovement({ item_id: item.id, type: 'out', quantity: 2 });
  assert.throws(() => inventoryService.addMovement({ item_id: item.id, type: 'out', quantity: 10 }), /in stock/);
  assert.strictEqual(inventoryService.lowStock().length, 1);
  inventoryService.addMovement({ item_id: item.id, type: 'adjust', quantity: 20 });
  assert.strictEqual(inventoryService.list()[0].quantity, 20);
  assert.strictEqual(inventoryService.movements(item.id).length, 3);

  // Files
  const { fileService, getFilesRoot } = load('services/file.service');
  const src = path.join(tmp, 'xray.png'); fs.writeFileSync(src, Buffer.from('89504e470d0a1a0a', 'hex'));
  fileService.addFiles(pid, [src], 'xray');
  const f = fileService.list(pid)[0];
  assert(fileService.getPreview(f.id).startsWith('data:image/png;base64,'));
  assert(fs.existsSync(path.join(getFilesRoot(), String(pid), f.stored_name)));

  // Analytics
  const { analyticsService } = load('services/analytics.service');
  const range = { startDate: '2000-01-01', endDate: '2099-12-31' };
  assert.strictEqual(analyticsService.procedureReport(range)[0].total_paise, 800000);
  const { transactionService } = load('services/transaction.service');
  transactionService.create({ type: 'income', patient_id: pid, invoice_id: inv.id, amount_paise: 750000, payment_method: 'upi', transaction_date: localDate() });
  assert.deepStrictEqual(analyticsService.collections(range).byMethod.map(m => [m.payment_method, m.total_paise]), [['upi', 750000]]);
  const trends = analyticsService.patientTrends(range);
  assert.strictEqual(trends.periods[0].new_patients, 1); assert.strictEqual(trends.registered, 1);
  const extras = analyticsService.dashboardExtras();
  assert.strictEqual(extras.queue.waiting, 2);
  load('services/report.service').reportService.getDashboardStats();

  // Password hashing incl. legacy upgrade
  const { doctorService } = load('services/doctor.service');
  doctorService.register({ name: 'Dr Test', email: 'd@example.com', password: 'secret12' });
  assert.throws(() => doctorService.login('wrong'), /Invalid password/);
  doctorService.login('secret12');
  db.prepare('UPDATE doctor SET password_hash = ?').run(require('crypto').createHash('sha256').update('old').digest('hex'));
  doctorService.login('old');
  assert(db.prepare('SELECT password_hash h FROM doctor').get().h.startsWith('scrypt$'), 'legacy hash upgraded');
  doctorService.login('old');

  // Backup, auto-backup, restore, factory reset
  const { backupService } = load('services/backup.service');
  const auto = backupService.autoBackup();
  assert(auto && fs.existsSync(auto), 'auto backup written');
  assert.strictEqual(backupService.autoBackup(), null, 'only one auto backup per day');
  const dest = path.join(tmp, 'manual'); fs.mkdirSync(dest);
  const backup = backupService.createBackup(dest);
  assert(fs.existsSync(backup.replace(/\.db$/, '-files')), 'attachments copied with manual backup');
  patientService.softDelete(pid);
  backupService.restoreBackup(backup);
  assert.strictEqual(load('services/patient.service').patientService.list({}).data.length, 1, 'restore brings data back');
  backupService.factoryReset();
  const db2 = getDatabase();
  assert.strictEqual(db2.prepare('SELECT COUNT(*) c FROM patients').get().c, 0);
  assert(db2.prepare('SELECT COUNT(*) c FROM treatments').get().c > 50, 'defaults reseeded after factory reset');
  assert(!fs.existsSync(getFilesRoot()));
  closeDatabase();
}

app.whenReady().then(() => {
  let code = 0;
  try {
    run();
    console.log('SMOKE TEST PASSED');
  } catch (err) {
    code = 1;
    console.error('SMOKE TEST FAILED\n', err);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  app.exit(code);
});
