const safeId = /^[a-zA-Z0-9_-]{1,80}$/;
const validId = value => typeof value === 'string' && safeId.test(value);
const validText = (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= limit;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function emptyGuide() {
  return { enabled: false, version: 0, definition: { startQuestionId: null, questions: [], includedAddOns: [], plans: [] } };
}

function idList(values, known, message) {
  check(Array.isArray(values) && values.length <= 500 && values.every(id => known.has(id)), message);
  return [...new Set(values)];
}

function validatePlans(source, main, known) {
  const plans = source ?? [];
  check(Array.isArray(plans) && plans.length <= 24, 'Use up to 24 plans in a guide.');
  const normalized = plans.map(plan => {
    check(validId(plan?.id) && validText(plan.title, 100), 'Enter a plan name of up to 100 characters.');
    check(Number.isInteger(plan.months) && plan.months >= 1 && plan.months <= 24, 'Enter a plan duration from 1 to 24 months.');
    check(Array.isArray(plan.phases) && plan.phases.length >= 1 && plan.phases.length <= 12, 'Give each plan between 1 and 12 phases.');
    const phases = plan.phases.map(phase => {
      check(validText(phase?.period, 70) && validText(phase.title, 100), 'Enter a period and title for each phase.');
      const serviceIds = idList(phase.serviceIds, main, 'Choose plan services from this business only.');
      check(serviceIds.length, 'Choose at least one service for each plan phase.');
      return { period: phase.period.trim(), title: phase.title.trim(), serviceIds };
    });
    return {
      id: plan.id, title: plan.title.trim(), months: plan.months, phases,
      addOnIds: idList(plan.addOnIds ?? [], known, 'Choose plan add-ons from this business only.'),
    };
  });
  check(new Set(normalized.map(plan => plan.id)).size === normalized.length, 'Plan IDs must be unique.');
  return normalized;
}

// The editor, preview and API use the same validation for a saved guide.
export function validateGuide(config, services) {
  check(config && typeof config.enabled === 'boolean', 'Choose whether this guide is enabled.');
  check(Number.isSafeInteger(config.version) && config.version >= 0, 'Reload the guide before saving.');
  const source = config.definition;
  check(Array.isArray(source?.questions) && source.questions.length <= 40, 'Use up to 40 questions in a guide.');
  const known = new Set(services.map(service => service.id));
  const main = new Set(services.filter(service => service.itemKind !== 'product' && !service.addonFor?.length).map(service => service.id));
  const plans = validatePlans(source.plans, main, known);
  const planIds = new Set(plans.map(plan => plan.id));
  const questions = source.questions.map(question => {
    check(validId(question?.id) && validText(question.text, 180), 'Enter a question of up to 180 characters.');
    check(Array.isArray(question.answers) && question.answers.length >= 1 && question.answers.length <= 20, 'Give every question between 1 and 20 answers.');
    const answers = question.answers.map(answer => {
      check(validId(answer?.id) && validText(answer.label, 100), 'Enter an answer of up to 100 characters.');
      check(['question', 'results', 'contact', 'plan'].includes(answer.next?.type), 'Choose what happens after each answer.');
      const next = { type: answer.next.type };
      if (next.type === 'question') next.questionId = answer.next.questionId;
      if (next.type === 'plan') {
        check(planIds.has(answer.next.planId), 'Link each plan answer to an existing plan.');
        next.planId = answer.next.planId;
      }
      return {
        id: answer.id,
        label: answer.label.trim(),
        next,
        serviceIds: answer.serviceIds == null ? null : idList(answer.serviceIds, main, 'Choose main services from this business only.'),
        addOnIds: answer.addOnIds == null ? null : idList(answer.addOnIds, known, 'Choose add-ons from this business only.'),
      };
    });
    check(new Set(answers.map(answer => answer.id)).size === answers.length, 'Answer IDs must be unique within a question.');
    return { id: question.id, text: question.text.trim(), answers };
  });
  const byId = new Map(questions.map(question => [question.id, question]));
  check(byId.size === questions.length, 'Question IDs must be unique.');
  const startQuestionId = source.startQuestionId ?? null;
  check(questions.length ? byId.has(startQuestionId) : !config.enabled && startQuestionId === null, 'Choose a first question before enabling the guide.');
  for (const question of questions) {
    for (const answer of question.answers) {
      check(answer.next.type !== 'question' || byId.has(answer.next.questionId), 'Link each answer to an existing question or an ending.');
    }
  }

  const active = new Set(), visited = new Set();
  function visit(id) {
    check(!active.has(id), 'Remove the loop in the question paths.');
    if (visited.has(id)) return;
    active.add(id);
    for (const answer of byId.get(id).answers) {
      if (answer.next.type === 'question') visit(answer.next.questionId);
    }
    active.delete(id);
    visited.add(id);
  }
  if (startQuestionId) visit(startQuestionId);
  check(visited.size === questions.length, 'Connect each question to the first question or remove it.');

  // A terminal recommendation needs an explicit mapping somewhere on its path.
  const checkedPaths = new Set();
  function checkMappings(id, hasFilter) {
    const key = id + '/' + hasFilter;
    if (checkedPaths.has(key)) return;
    checkedPaths.add(key);
    for (const answer of byId.get(id).answers) {
      const filtered = hasFilter || Boolean(answer.serviceIds?.length);
      if (answer.next.type === 'results') check(filtered, 'Map at least one service on every recommendation path.');
      if (answer.next.type === 'question') checkMappings(answer.next.questionId, filtered);
    }
  }
  if (startQuestionId) checkMappings(startQuestionId, false);

  const rules = source.includedAddOns ?? [];
  check(Array.isArray(rules) && rules.length <= 500, 'Check the add-ons already included in each service.');
  const included = new Set();
  const includedAddOns = rules.map(rule => {
    check(main.has(rule?.mainServiceId) && !included.has(rule.mainServiceId), 'Choose each service only once in the included add-ons settings.');
    included.add(rule.mainServiceId);
    return {
      mainServiceId: rule.mainServiceId,
      addOnIds: idList(rule.addOnIds, known, 'Choose included add-ons from this business only.').filter(id => id !== rule.mainServiceId),
    };
  }).filter(rule => rule.addOnIds.length);
  return { enabled: config.enabled, version: config.version, definition: { startQuestionId, questions, includedAddOns, plans } };
}

export const guideQuestion = (definition, id) =>
  Array.isArray(definition?.questions) ? definition.questions.find(question => question?.id === id) : undefined;

export function enabledGuide(guide) {
  const start = guideQuestion(guide?.definition, guide?.definition?.startQuestionId);
  return guide?.enabled && Array.isArray(start?.answers) && start.answers.length ? guide.definition : null;
}

function intersect(previous, next) {
  if (!Array.isArray(next)) return previous;
  return previous === null ? next : previous.filter(id => next.includes(id));
}

export function followGuide(definition, answerIds) {
  let question = guideQuestion(definition, definition?.startQuestionId);
  let serviceIds = null, addOnIds = null, used = 0;
  for (const id of answerIds) {
    const answer = question?.answers?.find(item => item.id === id);
    if (!answer?.next) break;
    used++;
    serviceIds = intersect(serviceIds, answer.serviceIds);
    addOnIds = intersect(addOnIds, answer.addOnIds);
    if (answer.next.type === 'plan') {
      const selectedPlan = definition.plans?.find(plan => plan.id === answer.next.planId);
      if (!selectedPlan) return { type: 'unavailable', used };
      const plan = {
        ...selectedPlan,
        phases: selectedPlan.phases.map(phase => ({ ...phase, serviceIds: intersect(serviceIds, phase.serviceIds) })),
      };
      return { type: 'plan', plan, serviceIds: plan.phases[0]?.serviceIds ?? [],
        addOnIds: intersect(addOnIds, plan.addOnIds) ?? [], used };
    }
    if (answer.next.type !== 'question') {
      return { type: answer.next.type, serviceIds: serviceIds ?? [], addOnIds: addOnIds ?? [], used };
    }
    question = guideQuestion(definition, answer.next.questionId);
  }
  return { type: question ? 'question' : 'unavailable', question, used };
}

export function publicServiceGuide(guide, services, resources) {
  const definition = enabledGuide(guide);
  if (!definition) return undefined;
  const resourceIds = new Set(resources.filter(resource => resource.active).map(resource => resource.id));
  const bookable = new Set(services.filter(service => service.active &&
    (service.itemKind === 'product' || service.resourceIds?.some(id => resourceIds.has(id)))).map(service => service.id));
  const filter = ids => ids === null ? null : ids.filter(id => bookable.has(id));
  return {
    enabled: true,
    definition: {
      startQuestionId: definition.startQuestionId,
      questions: definition.questions.map(question => ({
        ...question,
        answers: question.answers.map(answer => ({
          ...answer,
          serviceIds: filter(answer.serviceIds),
          addOnIds: filter(answer.addOnIds),
        })),
      })),
      includedAddOns: definition.includedAddOns
        .filter(rule => bookable.has(rule.mainServiceId))
        .map(rule => ({ ...rule, addOnIds: filter(rule.addOnIds) })),
      ...(definition.plans?.length ? { plans: definition.plans.map(plan => ({
        ...plan, addOnIds: filter(plan.addOnIds),
        phases: plan.phases.map(phase => ({ ...phase, serviceIds: filter(phase.serviceIds) })),
      })) } : {}),
    },
  };
}

// Upgrade an existing guide once without replacing its questions or other business settings.
export const HAYFA_PLAN_REVISION = 'hayfa-transformation-plans-v1';

export function addHayfaStarterPlans(current, starter) {
  if (!current?.definition || !starter?.definition?.plans?.length) return current;
  const existing = current.definition;
  const root = guideQuestion(existing, existing.startQuestionId);
  const starterRoot = guideQuestion(starter.definition, starter.definition.startQuestionId);
  const branchId = 'transformation-plans';
  const branch = starterRoot.answers.find(answer => answer.id === branchId);
  const planQuestions = starter.definition.questions.filter(question => question.id.startsWith('transformation-'));
  const questionIds = planQuestions.map(question => question.id);
  if (!branch || !root || root.answers.length >= 20 || existing.questions.length + planQuestions.length > 40 ||
      root.answers.some(answer => answer.id === branchId) ||
      questionIds.some(id => guideQuestion(existing, id))) return current;
  const currentPlans = existing.plans ?? [];
  if (starter.definition.plans.some(plan => currentPlans.some(item => item.id === plan.id))) return current;
  const questions = existing.questions.map(question => question.id === root.id
    ? { ...question, answers: [branch, ...question.answers] }
    : question);
  questions.push(...planQuestions);
  return { ...current, definition: { ...existing, questions, plans: [...currentPlans, ...starter.definition.plans] } };
}

export function recommendations(definition, path, services, resources, selectedIds) {
  const serviceIds = new Set(path.serviceIds);
  const addOnIds = new Set(path.addOnIds);
  const chosen = new Set(selectedIds);
  const availableResources = resources.filter(resource => resource.active);
  const available = services.filter(service => service.active &&
    (service.itemKind === 'product' || availableResources.some(resource => service.resourceIds?.includes(resource.id))));
  const mainServices = available.filter(service => serviceIds.has(service.id) &&
    service.itemKind !== 'product' && !service.addonFor?.length);
  const activeMain = mainServices.filter(service => chosen.has(service.id));
  if (!activeMain.length) return { mainServices, addOns: [] };
  const selectedServices = available.filter(service => chosen.has(service.id) && service.itemKind !== 'product');
  const shared = availableResources.filter(resource => selectedServices.every(service => service.resourceIds?.includes(resource.id)));
  const included = new Set((definition.includedAddOns ?? [])
    .filter(rule => chosen.has(rule.mainServiceId)).flatMap(rule => rule.addOnIds));
  const addOns = available.filter(service => addOnIds.has(service.id) && !serviceIds.has(service.id) &&
    !included.has(service.id) && (!service.addonFor?.length || activeMain.some(main => service.addonFor.includes(main.id))) &&
    (service.itemKind === 'product' || shared.some(resource => service.resourceIds?.includes(resource.id))));
  return { mainServices, addOns };
}
