import { randomUUID } from 'node:crypto';
import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import { createCatalogEntry } from './catalog-helper';
import db from '../../src/db/connection';
import { Op } from 'sequelize';
import TreatmentPlanItem from '../../src/models/treatment-plan-item.model';
import TreatmentCharge from '../../src/models/treatment-charge.model';
import Payment from '../../src/models/payment.model';
import PaymentRevision from '../../src/models/payment-revision.model';
import Odontogram from '../../src/models/odontogram.model';
import Patient from '../../src/models/patient.model';
import User from '../../src/models/user.model';
import { JwtAccessTokenService } from '../../src/modules/identity/identity.tokens';

const originalEnvironment = { ...process.env };
const silentLogger = pino({ level: 'silent' });
const runId = randomUUID();

let app: ReturnType<typeof createApp>;
let ownerA: User;
let ownerB: User;
let patientA: Patient;
let patientB: Patient;
let tokenA: string;
let tokenB: string;
let adultId: number;
let pediatricId: number;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

const createOwner = (suffix: string) =>
  User.create({
    name: `Owner ${suffix}`,
    middle_name: '',
    last_name: 'Odontograms Test',
    date_of_birth: null,
    phone: '',
    avatar: '',
    email: `odontograms-${suffix}-${runId}@example.test`,
    password: 'unused-test-password-hash',
    status: true,
    auth_version: 0,
    show_finance_stats: false,
  });

const createPatient = (userId: number, suffix: string) =>
  Patient.create({
    user_id: userId,
    name: `Patient ${suffix}`,
    middle_name: null,
    last_name: 'Odontograms Test',
    gender: null,
    date_of_birth: null,
    phone: null,
    marital_status: null,
    occupation: null,
    address: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    emergency_contact_relationship: null,
    reason_for_consultation: null,
    rfc: null,
    family_medical_history: null,
    personal_medical_history: null,
    email: null,
    status: true,
    debt: 0,
  });

beforeAll(async () => {
  process.env.JWT_SECRET = 'odontograms-test-secret-with-at-least-32-bytes';
  process.env.JWT_ISSUER = 'odontofy-odontograms-test';
  process.env.JWT_AUDIENCE = 'odontofy-odontograms-client';
  process.env.JWT_ACCESS_TTL_SECONDS = '600';

  await db.authenticate();
  ownerA = await createOwner('a');
  ownerB = await createOwner('b');
  patientA = await createPatient(ownerA.id, 'A');
  patientB = await createPatient(ownerB.id, 'B');

  const tokens = new JwtAccessTokenService();
  tokenA = tokens.issue(ownerA.id, ownerA.auth_version);
  tokenB = tokens.issue(ownerB.id, ownerB.auth_version);
  app = createApp({
    logger: silentLogger,
    readinessCheck: async () => undefined,
  });
});

afterAll(async () => {
  const payments = await Payment.findAll({
    where: { user_id: { [Op.in]: [ownerA?.id, ownerB?.id].filter(Boolean) } },
  });
  if (payments.length)
    await PaymentRevision.destroy({
      where: { payment_id: payments.map((row) => row.id) },
    });
  if (ownerA) await Odontogram.destroy({ where: { user_id: ownerA.id } });
  if (ownerB) await Odontogram.destroy({ where: { user_id: ownerB.id } });
  if (patientA) await patientA.destroy();
  if (patientB) await patientB.destroy();
  if (ownerA) await ownerA.destroy();
  if (ownerB) await ownerB.destroy();
  process.env = { ...originalEnvironment };
});

describe('odontograms v1 ownership and lifecycle', () => {
  it('creates multiple adult and pediatric charts for one patient', async () => {
    const adult = await request(app)
      .post(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA))
      .send({
        dentition: 'ADULT',
        title: 'Inicial adulto',
        findings: [
          {
            toothCode: '16',
            condition: 'CARIES',
            surface: 'OCCLUSAL_INCISAL',
          },
        ],
      });
    const pediatric = await request(app)
      .post(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA))
      .send({
        dentition: 'PEDIATRIC',
        title: 'Control infantil',
        findings: [{ toothCode: '55', condition: 'NOT_ERUPTED' }],
      });

    expect(adult.status).toBe(201);
    expect(adult.headers['cache-control']).toBe('no-store');
    expect(adult.body.data.findings[0]).toMatchObject({
      toothCode: '16',
      condition: 'CARIES',
    });
    expect(pediatric.status).toBe(201);
    adultId = adult.body.data.id;
    pediatricId = pediatric.body.data.id;

    const list = await request(app)
      .get(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.meta.pagination.total).toBe(2);
  });

  it('hides foreign patients and odontograms with the same 404 boundary', async () => {
    const foreignPatient = await request(app)
      .get(`/api/v1/patients/${patientB.id}/odontograms`)
      .set(bearer(tokenA));
    const foreignChart = await request(app)
      .get(`/api/v1/odontograms/${adultId}`)
      .set(bearer(tokenB));

    expect(foreignPatient.status).toBe(404);
    expect(foreignPatient.body.errors[0].code).toBe('PATIENT_NOT_FOUND');
    expect(foreignChart.status).toBe(404);
    expect(foreignChart.body.errors[0].code).toBe('ODONTOGRAM_NOT_FOUND');
  });

  it('validates dentition and archives without affecting other records', async () => {
    const invalid = await request(app)
      .patch(`/api/v1/odontograms/${adultId}`)
      .set(bearer(tokenA))
      .send({ findings: [{ toothCode: '55', condition: 'CARIES' }] });
    const archived = await request(app)
      .delete(`/api/v1/odontograms/${adultId}`)
      .set(bearer(tokenA));
    const replay = await request(app)
      .delete(`/api/v1/odontograms/${adultId}`)
      .set(bearer(tokenA));
    const active = await request(app)
      .get(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA));
    const restored = await request(app)
      .post(`/api/v1/odontograms/${adultId}/restore`)
      .set(bearer(tokenA));

    expect(invalid.status).toBe(400);
    expect(invalid.body.errors[0].code).toBe('INVALID_TOOTH_CODE');
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).toBeTypeOf('string');
    expect(replay.status).toBe(200);
    expect(active.body.data.map((chart: { id: number }) => chart.id)).toEqual([
      pediatricId,
    ]);
    expect(restored.status).toBe(200);
    expect(restored.body.data.archivedAt).toBeNull();
  });
});

describe('odontogram finding treatment links', () => {
  it('links only same-patient items and preserves links across note edits', async () => {
    const chart = await request(app)
      .post(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA))
      .send({
        dentition: 'ADULT',
        findings: [{ toothCode: '16', condition: 'CARIES' }],
      });
    expect(chart.status).toBe(201);
    const chartId = chart.body.data.id as number;
    const findingId = chart.body.data.findings[0].id as number;

    const plan = await request(app)
      .post(`/api/v1/patients/${patientA.id}/treatment-plans`)
      .set(bearer(tokenA))
      .send({ title: 'Restauracion' });
    expect(plan.status).toBe(201);
    const item = await request(app)
      .post(`/api/v1/treatment-plans/${plan.body.data.id}/items`)
      .set(bearer(tokenA))
      .send({
        userConceptId: await createCatalogEntry(
          app,
          tokenA,
          'Resina',
          '250.00'
        ),
      });
    expect(item.status).toBe(201);
    const itemId = item.body.data.item.id as number;
    const path = `/api/v1/odontograms/${chartId}/findings/${findingId}/treatment-items/${itemId}`;

    const foreignPlan = await request(app)
      .post(`/api/v1/patients/${patientB.id}/treatment-plans`)
      .set(bearer(tokenB))
      .send({ title: 'Otro propietario' });
    const foreignItem = await request(app)
      .post(`/api/v1/treatment-plans/${foreignPlan.body.data.id}/items`)
      .set(bearer(tokenB))
      .send({
        userConceptId: await createCatalogEntry(
          app,
          tokenB,
          'Resina ajena',
          '1.00'
        ),
      });
    const foreignLink = await request(app)
      .put(
        `/api/v1/odontograms/${chartId}/findings/${findingId}/treatment-items/${foreignItem.body.data.item.id}`
      )
      .set(bearer(tokenA));
    expect(foreignLink.status).toBe(404);

    const otherPatient = await createPatient(
      ownerA.id,
      'Same-owner-other-patient'
    );
    const otherPlan = await request(app)
      .post(`/api/v1/patients/${otherPatient.id}/treatment-plans`)
      .set(bearer(tokenA))
      .send({ title: 'Otro paciente' });
    const otherItem = await request(app)
      .post(`/api/v1/treatment-plans/${otherPlan.body.data.id}/items`)
      .set(bearer(tokenA))
      .send({
        userConceptId: await createCatalogEntry(
          app,
          tokenA,
          'Tratamiento distinto',
          '1.00'
        ),
      });
    const mismatch = await request(app)
      .put(
        `/api/v1/odontograms/${chartId}/findings/${findingId}/treatment-items/${otherItem.body.data.item.id}`
      )
      .set(bearer(tokenA));
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.errors[0].code).toBe('TREATMENT_PATIENT_MISMATCH');
    await otherPatient.destroy();

    const linked = await request(app).put(path).set(bearer(tokenA));
    const replay = await request(app).put(path).set(bearer(tokenA));
    expect(linked.status).toBe(200);
    expect(replay.body.data.findings[0].treatmentPlanItemIds).toEqual([itemId]);
    expect(replay.body.data.findings[0].treatmentPlanItems).toEqual([
      {
        id: itemId,
        treatmentPlanId: plan.body.data.id,
        userConceptId: item.body.data.item.userConceptId,
        name: 'Resina',
        status: 'PENDING',
      },
    ]);
    const secondItem = await request(app)
      .post(`/api/v1/treatment-plans/${plan.body.data.id}/items`)
      .set(bearer(tokenA))
      .send({
        userConceptId: await createCatalogEntry(
          app,
          tokenA,
          'Corona',
          '500.00'
        ),
      });
    const secondItemId = secondItem.body.data.item.id as number;
    const secondPath = `/api/v1/odontograms/${chartId}/findings/${findingId}/treatment-items/${secondItemId}`;
    const secondLink = await request(app).put(secondPath).set(bearer(tokenA));
    expect(secondLink.body.data.findings[0].treatmentPlanItemIds).toEqual([
      itemId,
      secondItemId,
    ]);

    const edited = await request(app)
      .patch(`/api/v1/odontograms/${chartId}`)
      .set(bearer(tokenA))
      .send({
        findings: [{ toothCode: '16', condition: 'CARIES', notes: 'Profunda' }],
      });
    expect(edited.status).toBe(200);
    expect(edited.body.data.findings[0]).toMatchObject({
      id: findingId,
      notes: 'Profunda',
      treatmentPlanItemIds: [itemId, secondItemId],
    });

    await request(app)
      .delete(`/api/v1/odontograms/${chartId}`)
      .set(bearer(tokenA));
    const archived = await request(app).delete(path).set(bearer(tokenA));
    expect(archived.status).toBe(409);
    await request(app)
      .post(`/api/v1/odontograms/${chartId}/restore`)
      .set(bearer(tokenA));

    const unlinked = await request(app).delete(path).set(bearer(tokenA));
    const unlinkReplay = await request(app).delete(path).set(bearer(tokenA));
    expect(unlinked.status).toBe(200);
    expect(unlinkReplay.body.data.findings[0].treatmentPlanItemIds).toEqual([
      secondItemId,
    ]);
    await request(app).delete(secondPath).set(bearer(tokenA));
    await request(app).put(path).set(bearer(tokenA));

    const removed = await request(app)
      .patch(`/api/v1/odontograms/${chartId}`)
      .set(bearer(tokenA))
      .send({ findings: [] });
    expect(removed.status).toBe(409);
    expect(removed.body.errors[0].code).toBe(
      'ODONTOGRAM_FINDING_HAS_TREATMENTS'
    );
    await request(app).delete(path).set(bearer(tokenA));
    const finallyRemoved = await request(app)
      .patch(`/api/v1/odontograms/${chartId}`)
      .set(bearer(tokenA))
      .send({ findings: [] });
    expect(finallyRemoved.status).toBe(200);
    expect(finallyRemoved.body.data.findings).toEqual([]);
  });

  const createChart = async (pediatric = false) => {
    const response = await request(app)
      .post(`/api/v1/patients/${patientA.id}/odontograms`)
      .set(bearer(tokenA))
      .send({
        dentition: pediatric ? 'PEDIATRIC' : 'ADULT',
        findings: [
          {
            toothCode: pediatric ? '55' : '16',
            condition: 'CARIES',
            surface: 'MESIAL',
          },
          { toothCode: pediatric ? '54' : '15', condition: 'FRACTURE' },
        ],
      });
    expect(response.status).toBe(201);
    return response.body.data;
  };
  const createFromFinding = (
    chartId: number,
    findingId: number,
    userConceptId: number,
    key = randomUUID(),
    quantity = '1.00'
  ) =>
    request(app)
      .post(`/api/v1/odontograms/${chartId}/findings/${findingId}/treatments`)
      .set(bearer(tokenA))
      .set('Idempotency-Key', key)
      .send({ userConceptId, quantity, notes: 'Tratamiento propuesto' });

  it('rejects new links to cancelled or manual treatments but preserves existing links and archived references', async () => {
    const chart = await createChart(); const finding = chart.findings[0];
    const catalog = await createCatalogEntry(app, tokenA, 'Clinical link eligibility', '100.00');
    const created = await request(app).post(`/api/v1/patients/${patientA.id}/treatments`).set(bearer(tokenA)).send({ userConceptId: catalog });
    const item = (await TreatmentPlanItem.findByPk(created.body.data.id))!;
    const path = `/api/v1/odontograms/${chart.id}/findings/${finding.id}/treatment-items/${item.id}`;
    await item.update({ status: 'CANCELLED' });
    expect((await request(app).put(path).set(bearer(tokenA))).status).toBe(409);
    await item.update({ status: 'PENDING', user_concept_id: null });
    expect((await request(app).put(path).set(bearer(tokenA))).status).toBe(409);
    await item.update({ user_concept_id: catalog });
    expect((await request(app).put(path).set(bearer(tokenA))).status).toBe(200);
    await item.update({ status: 'CANCELLED' });
    expect((await request(app).put(path).set(bearer(tokenA))).status).toBe(200);
    await request(app).delete(`/api/v1/odontograms/${chart.id}`).set(bearer(tokenA));
    const listed = await request(app).get(`/api/v1/patients/${patientA.id}/treatments`).set(bearer(tokenA)).query({ scope: 'all', pageSize: 100 });
    expect(listed.body.data.find((row: { id: number }) => row.id === item.id).odontogramReferences[0].archived).toBe(true);
    expect((await request(app).delete(path).set(bearer(tokenA))).status).toBe(409);
  });

  it('atomically creates catalog treatments for adult and pediatric findings with no plan, charge or receipt', async () => {
    for (const pediatric of [false, true]) {
      const chart = await createChart(pediatric);
      const finding = chart.findings.find(
        (row: { surface: string | null }) => row.surface === 'MESIAL'
      );
      const catalog = await createCatalogEntry(
        app,
        tokenA,
        'Resina desde hallazgo',
        '123.45'
      );
      const created = await createFromFinding(
        chart.id,
        finding.id,
        catalog,
        randomUUID(),
        '2.00'
      );
      expect(created.status).toBe(201);
      const item = (await TreatmentPlanItem.findByPk(
        created.body.data.treatmentId
      ))!;
      expect(item.toJSON()).toMatchObject({
        patient_id: patientA.id,
        treatment_plan_id: null,
        user_concept_id: catalog,
        name: 'Resina desde hallazgo',
        tooth: pediatric ? '55' : '16',
        area: 'MESIAL',
        unit_price: '123.45',
        quantity: '2.00',
        subtotal: '246.90',
        status: 'PENDING',
      });
      expect(
        created.body.data.odontogram.findings.find(
          (row: { id: number }) => row.id === finding.id
        ).treatmentPlanItems[0]
      ).toMatchObject({ id: item.id, treatmentPlanId: null });
      const treatments = await request(app)
        .get(`/api/v1/patients/${patientA.id}/treatments`)
        .set(bearer(tokenA))
        .query({ scope: 'all', pageSize: 100 });
      expect(
        treatments.body.data.find((row: { id: number }) => row.id === item.id)
          .odontogramReferences
      ).toEqual([
        {
          odontogramId: chart.id,
          findingId: finding.id,
          title: null,
          toothCode: pediatric ? '55' : '16',
          condition: 'CARIES',
          surface: 'MESIAL',
          archived: false,
        },
      ]);
      expect(
        await TreatmentCharge.count({ where: { treatment_id: item.id } })
      ).toBe(0);
      expect(await Payment.count({ where: { patientId: patientA.id } })).toBe(
        0
      );
    }
  });

  it('does not duplicate atomic creations on concurrent retries or repeated catalog selection', async () => {
    const chart = await createChart();
    const finding = chart.findings[0];
    const catalog = await createCatalogEntry(
      app,
      tokenA,
      'Idempotent treatment',
      '50.00'
    );
    const before = await TreatmentPlanItem.count({
      where: { patient_id: patientA.id },
    });
    const key = randomUUID();
    const [a, b] = await Promise.all([
      createFromFinding(chart.id, finding.id, catalog, key),
      createFromFinding(chart.id, finding.id, catalog, key),
    ]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.data.treatmentId).toBe(b.body.data.treatmentId);
    expect(
      (await createFromFinding(chart.id, finding.id, catalog)).status
    ).toBe(409);
    expect(
      (await createFromFinding(chart.id, finding.id, catalog, key, '2.00'))
        .status
    ).toBe(409);
    expect(
      await TreatmentPlanItem.count({ where: { patient_id: patientA.id } })
    ).toBe(before + 1);
    const link = `/api/v1/odontograms/${chart.id}/findings/${finding.id}/treatment-items/${a.body.data.treatmentId}`;
    await request(app).delete(link).set(bearer(tokenA));
    const retry = await createFromFinding(chart.id, finding.id, catalog, key);
    expect(retry.status).toBe(201);
    expect(retry.body.data.odontogram.findings[0].treatmentPlanItemIds).toEqual(
      []
    );
    expect(
      await TreatmentPlanItem.count({ where: { patient_id: patientA.id } })
    ).toBe(before + 1);
  });

  it('validates ownership, catalog eligibility, archived charts and missing findings without orphan creation', async () => {
    const chart = await createChart();
    const finding = chart.findings[0];
    const catalog = await createCatalogEntry(
      app,
      tokenA,
      'Archived catalog',
      '100.00'
    );
    const foreign = await createCatalogEntry(
      app,
      tokenB,
      'Foreign catalog',
      '10.00'
    );
    const count = await TreatmentPlanItem.count({
      where: { patient_id: patientA.id },
    });
    expect(
      (await createFromFinding(chart.id, finding.id, foreign)).status
    ).toBe(404);
    expect(
      (await createFromFinding(chart.id, 4294967295, catalog)).status
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(
            `/api/v1/odontograms/${chart.id}/findings/${finding.id}/treatments`
          )
          .set(bearer(tokenB))
          .set('Idempotency-Key', randomUUID())
          .send({ userConceptId: foreign })
      ).status
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(
            `/api/v1/odontograms/${chart.id}/findings/${finding.id}/treatments`
          )
          .set(bearer(tokenA))
          .send({ userConceptId: catalog })
      ).status
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(
            `/api/v1/odontograms/${chart.id}/findings/${finding.id}/treatments`
          )
          .set(bearer(tokenA))
          .set('Idempotency-Key', randomUUID())
          .send({ userConceptId: catalog, unitPrice: '1.00' })
      ).status
    ).toBe(400);
    await request(app)
      .delete(`/api/v1/billing-concepts/${catalog}`)
      .set(bearer(tokenA));
    expect(
      (await createFromFinding(chart.id, finding.id, catalog)).status
    ).toBe(409);
    const active = await createCatalogEntry(
      app,
      tokenA,
      'Active catalog',
      '100.00'
    );
    await request(app)
      .delete(`/api/v1/odontograms/${chart.id}`)
      .set(bearer(tokenA));
    expect((await createFromFinding(chart.id, finding.id, active)).status).toBe(
      409
    );
    expect(
      await TreatmentPlanItem.count({ where: { patient_id: patientA.id } })
    ).toBe(count);
  });

  it('reuses an independent treatment across findings and unlinking preserves its financial records', async () => {
    const chart = await createChart();
    const finding = chart.findings[0];
    const other = chart.findings[1];
    const catalog = await createCatalogEntry(
      app,
      tokenA,
      'Existing independent',
      '100.00'
    );
    const treatment = await request(app)
      .post(`/api/v1/patients/${patientA.id}/treatments`)
      .set(bearer(tokenA))
      .send({ userConceptId: catalog, tooth: '11', notes: 'Conservar nota' });
    const itemId = treatment.body.data.id;
    const before = await TreatmentPlanItem.count({
      where: { patient_id: patientA.id },
    });
    const path = (findingId: number) =>
      `/api/v1/odontograms/${chart.id}/findings/${findingId}/treatment-items/${itemId}`;
    expect(
      (await request(app).put(path(finding.id)).set(bearer(tokenA))).status
    ).toBe(200);
    expect(
      (await request(app).put(path(other.id)).set(bearer(tokenA))).status
    ).toBe(200);
    expect(
      (await request(app).put(path(other.id)).set(bearer(tokenA))).status
    ).toBe(200);
    expect(
      await TreatmentPlanItem.count({ where: { patient_id: patientA.id } })
    ).toBe(before);
    const charge = await request(app)
      .post(
        `/api/v1/patients/${patientA.id}/treatment-charges/${itemId}/confirmation`
      )
      .set(bearer(tokenA))
      .send({
        occurredOn: new Date().toISOString().slice(0, 10),
        expectedTotal: '100.00',
      });
    expect(charge.status).toBe(200);
    const paid = await request(app)
      .post(`/api/v1/patients/${patientA.id}/treatment-payments`)
      .set(bearer(tokenA))
      .set('Idempotency-Key', randomUUID())
      .send({
        occurredOn: new Date().toISOString().slice(0, 10),
        paymentMethod: 'CASH',
        allocations: [{ chargeId: charge.body.data.chargeId, amount: '40.00' }],
      });
    expect(paid.status).toBe(201);
    const beforeBalance = String((await Patient.findByPk(patientA.id))!.debt);
    const blocked = await request(app)
      .patch(`/api/v1/odontograms/${chart.id}`)
      .set(bearer(tokenA))
      .send({ findings: [{ toothCode: '18', condition: 'CARIES' }] });
    expect(blocked.status).toBe(409);
    expect(
      (await request(app).delete(path(finding.id)).set(bearer(tokenA))).status
    ).toBe(200);
    expect(
      (await request(app).delete(path(finding.id)).set(bearer(tokenA))).status
    ).toBe(200);
    const item = (await TreatmentPlanItem.findByPk(itemId))!;
    expect(item.toJSON()).toMatchObject({
      tooth: '11',
      notes: 'Conservar nota',
      subtotal: '100.00',
    });
    expect(String((await Patient.findByPk(patientA.id))!.debt)).toBe(
      beforeBalance
    );
    expect(
      (await Payment.findByPk(paid.body.data.billingRecordId))!.status
    ).toBe('POSTED');
    const refs = await request(app)
      .get(`/api/v1/patients/${patientA.id}/treatments`)
      .set(bearer(tokenA))
      .query({ scope: 'all', pageSize: 100 });
    expect(
      refs.body.data.find((row: { id: number }) => row.id === itemId)
        .odontogramReferences
    ).toHaveLength(1);
  });
});
