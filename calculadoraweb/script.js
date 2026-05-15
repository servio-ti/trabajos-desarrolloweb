/* ══════════════════════════════════════════
   ESTADO DE LA CALCULADORA
══════════════════════════════════════════ */
const state = {
  current:     '0',
  operator:    null,
  previous:    null,
  waitingNext: false,
  history:     [],
};

/* ══════════════════════════════════════════
   REFERENCIAS AL DOM
══════════════════════════════════════════ */
const resultEl     = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const histBtn      = document.getElementById('histBtn');
const histPanel    = document.getElementById('histPanel');
const histList     = document.getElementById('histList');

/* ══════════════════════════════════════════
   DISPLAY — actualizar pantalla
══════════════════════════════════════════ */
function updateDisplay(val, expr = '') {
  resultEl.classList.remove('error');
  const txt = String(val);
  resultEl.textContent = txt;
  resultEl.className   = 'result';

  // Ajuste de tamaño de fuente según longitud
  if (txt.length > 14)      resultEl.classList.add('xsmall');
  else if (txt.length > 9)  resultEl.classList.add('small');

  expressionEl.textContent = expr;
}

/* ── Mostrar error en pantalla ── */
function showError(msg = 'Error') {
  resultEl.textContent     = msg;
  resultEl.className       = 'result error';
  expressionEl.textContent = '';

  // Resetear estado
  state.current     = '0';
  state.operator    = null;
  state.previous    = null;
  state.waitingNext = false;
}

/* ── Animación pop al calcular ── */
function popAnimate() {
  resultEl.classList.remove('pop');
  void resultEl.offsetWidth; // forzar reflow para reiniciar la animación
  resultEl.classList.add('pop');
}

/* ══════════════════════════════════════════
   ARITMÉTICA
══════════════════════════════════════════ */

/**
 * Realiza la operación entre dos números.
 * Devuelve null si hay división por cero.
 */
function compute(a, op, b) {
  a = parseFloat(a);
  b = parseFloat(b);

  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? null : a / b;
    default:  return null;
  }
}

/**
 * Formatea un número para mostrarlo limpiamente:
 * - Usa notación científica para valores muy grandes o muy pequeños.
 * - Evita imprecisiones de punto flotante (ej: 0.1 + 0.2).
 */
function formatNum(n) {
  if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-7 && n !== 0)) {
    return parseFloat(n.toPrecision(10)).toExponential();
  }
  return String(parseFloat(n.toPrecision(12)));
}

/* ══════════════════════════════════════════
   HISTORIAL
══════════════════════════════════════════ */

/** Agrega una operación al historial (máximo 20). */
function addHistory(expr, res) {
  state.history.unshift({ expr, res });
  if (state.history.length > 20) state.history.pop();
  renderHistory();
}

/** Renderiza la lista del historial en el DOM. */
function renderHistory() {
  if (state.history.length === 0) {
    histList.innerHTML = '<div class="history-empty">Sin operaciones aún.</div>';
    return;
  }

  histList.innerHTML = state.history
    .map((h, i) => `
      <div class="history-item" data-idx="${i}">
        <span class="h-expr">${h.expr}</span>
        <span>${h.res}</span>
      </div>
    `)
    .join('');

  // Clic en un ítem → carga el resultado en la calculadora
  histList.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', () => {
      const item = state.history[+el.dataset.idx];
      state.current     = item.res;
      state.waitingNext = true;
      updateDisplay(item.res);
    });
  });
}

/* ══════════════════════════════════════════
   ACCIONES — LÓGICA DE CADA BOTÓN
══════════════════════════════════════════ */

/** Agrega un dígito al número actual. */
function handleNum(digit) {
  if (state.waitingNext) {
    state.current     = digit;
    state.waitingNext = false;
  } else {
    state.current = state.current === '0'
      ? digit
      : (state.current.length < 16 ? state.current + digit : state.current);
  }

  const expr = state.previous !== null
    ? `${formatNum(state.previous)} ${state.operator} ${state.current}`
    : '';

  updateDisplay(state.current, expr);
}

/** Agrega el punto decimal. */
function handleDecimal() {
  if (state.waitingNext) {
    state.current     = '0.';
    state.waitingNext = false;
    updateDisplay('0.');
    return;
  }
  if (!state.current.includes('.')) {
    state.current += '.';
    updateDisplay(state.current);
  }
}

/** Establece el operador y prepara el siguiente número. */
function handleOperator(op) {
  const cur = parseFloat(state.current);

  if (state.operator && !state.waitingNext) {
    // Encadenar operaciones sin pulsar =
    const res = compute(state.previous, state.operator, cur);
    if (res === null) { showError('÷ por 0'); return; }
    const fmt      = formatNum(res);
    state.previous = fmt;
    state.current  = fmt;
    updateDisplay(fmt, `${fmt} ${op}`);
  } else {
    state.previous = state.current;
    updateDisplay(state.current, `${state.current} ${op}`);
  }

  state.operator    = op;
  state.waitingNext = true;
}

/** Calcula el resultado final. */
function handleEquals() {
  if (state.operator === null || state.previous === null) {
    popAnimate();
    return;
  }

  const cur  = parseFloat(state.current);
  const prev = parseFloat(state.previous);
  const expr = `${formatNum(prev)} ${state.operator} ${formatNum(cur)}`;
  const res  = compute(state.previous, state.operator, cur);

  if (res === null) { showError('÷ por 0'); return; }

  const fmt = formatNum(res);
  addHistory(`${expr} =`, fmt);
  popAnimate();
  updateDisplay(fmt, `${expr} =`);

  state.current     = fmt;
  state.operator    = null;
  state.previous    = null;
  state.waitingNext = true;
}

/** Limpia todo y vuelve a cero. */
function handleClear() {
  state.current     = '0';
  state.operator    = null;
  state.previous    = null;
  state.waitingNext = false;
  updateDisplay('0', '');
}

/** Borra el último dígito ingresado. */
function handleBackspace() {
  if (state.waitingNext) return;

  if (
    state.current.length === 1 ||
    (state.current.length === 2 && state.current[0] === '-')
  ) {
    state.current = '0';
  } else {
    state.current = state.current.slice(0, -1);
  }

  updateDisplay(state.current);
}

/** Cambia el signo del número actual (+/−). */
function handleSign() {
  if (state.current === '0') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;
  updateDisplay(state.current);
}

/** Convierte el número actual a porcentaje (÷ 100). */
function handlePercent() {
  const v = parseFloat(state.current);
  if (isNaN(v)) return;
  const res     = formatNum(v / 100);
  state.current = res;
  updateDisplay(res);
}

/** Calcula la raíz cuadrada del número actual. */
function handleSqrt() {
  const v = parseFloat(state.current);
  if (v < 0) { showError('√ negativo'); return; }

  const res = formatNum(Math.sqrt(v));
  addHistory(`√(${formatNum(v)}) =`, res);
  popAnimate();

  state.current     = res;
  state.waitingNext = true;
  updateDisplay(res, `√(${formatNum(v)}) =`);
}

/** Calcula el cuadrado del número actual (x²). */
function handleSquare() {
  const v   = parseFloat(state.current);
  const res = formatNum(v * v);
  addHistory(`(${formatNum(v)})² =`, res);
  popAnimate();

  state.current     = res;
  state.waitingNext = true;
  updateDisplay(res, `(${formatNum(v)})² =`);
}

/* ══════════════════════════════════════════
   EVENTOS — CLIC EN BOTONES
══════════════════════════════════════════ */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', e => {

    // ── Efecto Ripple ──
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      width:  ${size}px;
      height: ${size}px;
      left:   ${e.clientX - rect.left - size / 2}px;
      top:    ${e.clientY - rect.top  - size / 2}px;
    `;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // ── Acción correspondiente ──
    const { action, value } = btn.dataset;
    switch (action) {
      case 'num':       handleNum(value);      break;
      case 'op':        handleOperator(value); break;
      case 'equals':    handleEquals();         break;
      case 'clear':     handleClear();          break;
      case 'backspace': handleBackspace();      break;
      case 'sign':      handleSign();           break;
      case 'percent':   handlePercent();        break;
      case 'decimal':   handleDecimal();        break;
      case 'sqrt':      handleSqrt();           break;
      case 'square':    handleSquare();         break;
    }
  });
});

/* ══════════════════════════════════════════
   EVENTOS — TECLADO
══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  // Dígitos 0–9
  if (e.key >= '0' && e.key <= '9') { handleNum(e.key); return; }

  switch (e.key) {
    case '+':         handleOperator('+'); break;
    case '-':         handleOperator('−'); break;
    case '*':         handleOperator('×'); break;
    case '/':         e.preventDefault(); handleOperator('÷'); break;
    case 'Enter':
    case '=':         handleEquals();     break;
    case 'Backspace': handleBackspace();  break;
    case 'Escape':    handleClear();      break;
    case '.':
    case ',':         handleDecimal();    break;
    case '%':         handlePercent();    break;
  }
});

/* ══════════════════════════════════════════
   HISTORIAL — TOGGLE
══════════════════════════════════════════ */
histBtn.addEventListener('click', () => {
  const isOpen = histPanel.classList.toggle('open');
  histBtn.textContent = isOpen ? '▴ HISTORIAL' : '▾ HISTORIAL';
});

/* ══════════════════════════════════════════
   INICIALIZACIÓN
══════════════════════════════════════════ */
updateDisplay('0');
