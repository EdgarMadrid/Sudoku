// ============================================================
// CONFIGURACION
// ============================================================
const CONFIG = {
  6: { clues: 18, subRows: 2, subCols: 3 },
  9: { clues: 32, subRows: 3, subCols: 3 },
  12: { clues: 50, subRows: 3, subCols: 4 },
  16: { clues: 80, subRows: 4, subCols: 4 },
};

const DEFAULT_SIZE = 6;
const MAX_ITERATIONS = 5000000;

// ============================================================
// ESTADO GLOBAL
// ============================================================
let currentSize = null;
let currentSubRows = null;
let currentSubCols = null;
let solverCount = 0;
let segundos = 0;
let timerInterval = null;
let tableroOriginal = null;

// ============================================================
// CONVERSION: numero interno ↔ caracter (1-9, A-Z)
// ============================================================
function toDisplay(n) {
  if (n >= 1 && n <= 9) return String(n);
  if (n >= 10) return String.fromCharCode(n + 55);
  return "";
}

function toInternal(c) {
  if (!c) return 0;
  let code = c.trim().toUpperCase().charCodeAt(0);
  if (code >= 49 && code <= 57) return code - 48;
  if (code >= 65 && code <= 90) return code - 55;
  return 0;
}

// ============================================================
// TIMER
// ============================================================
function actualizarTimer() {
  let el = document.getElementById("timer");
  if (!el) return;
  let m = Math.floor(segundos / 60);
  let s = segundos % 60;
  el.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

function iniciarTimer() {
  detenerTimer();
  segundos = 0;
  actualizarTimer();
  timerInterval = setInterval(function () {
    segundos++;
    actualizarTimer();
  }, 1000);
}

function detenerTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ============================================================
// MEJORES TIEMPOS (localStorage)
// ============================================================
const TIEMPOS_KEY = "sudoku-tiempos";

function obtenerMejores() {
  try {
    return JSON.parse(localStorage.getItem(TIEMPOS_KEY)) || {};
  } catch {
    return {};
  }
}

function mostrarMejor(dificultad) {
  let el = document.getElementById("best-time");
  if (!el) return;
  let tiempos = obtenerMejores();
  let t = tiempos[dificultad];
  if (t != null) {
    let m = Math.floor(t / 60);
    let s = t % 60;
    el.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  } else {
    el.textContent = "--:--";
  }
}

function guardarMejor(dificultad) {
  let tiempos = obtenerMejores();
  if (!tiempos[dificultad] || segundos < tiempos[dificultad]) {
    tiempos[dificultad] = segundos;
    localStorage.setItem(TIEMPOS_KEY, JSON.stringify(tiempos));
  }
  mostrarMejor(dificultad);
}

// ============================================================
// PERSISTENCIA DEL JUEGO (localStorage)
// ============================================================
const ESTADO_KEY = "sudoku-game";

function guardarEstado(board, resuelto) {
  let prefilled = [];
  for (let r = 0; r < board.length; r++) {
    prefilled[r] = [];
    for (let c = 0; c < board.length; c++) {
      let inp = document.querySelector(
        '.hit[data-row="' + r + '"][data-col="' + c + '"]',
      );
      prefilled[r][c] = inp
        ? inp.dataset.prefilled === "true"
        : board[r][c] !== 0;
    }
  }
  let state = {
    board: board,
    size: currentSize,
    subRows: currentSubRows,
    subCols: currentSubCols,
    prefilled: prefilled,
    elapsed: segundos,
    solved: resuelto,
    original: tableroOriginal,
  };
  try {
    localStorage.setItem(ESTADO_KEY, JSON.stringify(state));
  } catch {}
}

function cargarEstado() {
  try {
    let data = localStorage.getItem(ESTADO_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function borrarEstado() {
  localStorage.removeItem(ESTADO_KEY);
}

// ============================================================
// LOGICA DEL SUDOKU
// ============================================================

function crearTablero(size) {
  let b = [];
  for (let r = 0; r < size; r++) {
    b[r] = [];
    for (let c = 0; c < size; c++) b[r][c] = 0;
  }
  return b;
}

function copiarTablero(board) {
  return board.map(function (fila) {
    return [...fila];
  });
}

function esValido(board, row, col, num, sr, sc) {
  let size = board.length;
  for (let c = 0; c < size; c++) if (board[row][c] === num) return false;
  for (let r = 0; r < size; r++) if (board[r][col] === num) return false;
  let br = Math.floor(row / sr) * sr;
  let bc = Math.floor(col / sc) * sc;
  for (let r = br; r < br + sr; r++)
    for (let c = bc; c < bc + sc; c++) if (board[r][c] === num) return false;
  return true;
}

function buscarVacio(board) {
  let size = board.length;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (board[r][c] === 0) return [r, c];
  return null;
}

function resolver(board, sr, sc) {
  solverCount = 0;
  return backtrack(board, sr, sc);
}

function backtrack(board, sr, sc) {
  solverCount++;
  if (solverCount > MAX_ITERATIONS) return false;

  let celda = buscarVacio(board);
  if (!celda) return true;

  let [row, col] = celda;
  let size = board.length;

  let nums = [];
  for (let i = 1; i <= size; i++) nums.push(i);
  for (let i = nums.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  for (let n of nums) {
    if (esValido(board, row, col, n, sr, sc)) {
      board[row][col] = n;
      if (backtrack(board, sr, sc)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function validarTablero(board, sr, sc) {
  let size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let n = board[r][c];
      if (n < 0 || n > size) return false;
      if (n !== 0) {
        board[r][c] = 0;
        let ok = esValido(board, r, c, n, sr, sc);
        board[r][c] = n;
        if (!ok) return false;
      }
    }
  }
  return true;
}

function generarBoard(size, sr, sc) {
  let nums = [];
  for (let i = 1; i <= size; i++) nums.push(i);
  for (let i = nums.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  let board = crearTablero(size);
  for (let r = 0; r < size; r++) {
    let band = Math.floor(r / sr);
    let rowInBand = r % sr;
    let shift = band + rowInBand * sc;
    for (let c = 0; c < size; c++) {
      board[r][c] = nums[(c + shift) % size];
    }
  }
  return board;
}

function generarPuzzle(size, sr, sc, clues) {
  let board = generarBoard(size, sr, sc);
  let puzzle = copiarTablero(board);
  let celdas = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) celdas.push([r, c]);
  for (let i = celdas.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [celdas[i], celdas[j]] = [celdas[j], celdas[i]];
  }
  let quitar = size * size - clues;
  let q = 0;
  for (let [r, c] of celdas) {
    if (q >= quitar) break;
    puzzle[r][c] = 0;
    q++;
  }
  return puzzle;
}

// ============================================================
// UI
// ============================================================

function crearGrid(size, sr, sc) {
  let div = document.getElementById("sudoku-board");
  div.innerHTML = "";

  let tabla = document.createElement("table");
  let tbody = document.createElement("tbody");
  let cellSize = Math.max(24, Math.min(48, Math.floor(460 / size)));

  for (let r = 0; r < size; r++) {
    let tr = document.createElement("tr");
    if (r % sr === 0) tr.className = "top-line";
    if ((r + 1) % sr === 0) tr.classList.add("bottom-line");

    for (let c = 0; c < size; c++) {
      let td = document.createElement("td");
      if (c % sc === 0) td.className = "lof";
      if ((c + 1) % sc === 0) td.classList.add("rof");

      let inp = document.createElement("input");
      inp.type = "text";
      inp.maxLength = 1;
      inp.className = "hit";
      inp.dataset.row = r;
      inp.dataset.col = c;
      inp.style.width = cellSize + "px";
      inp.style.height = cellSize + "px";

      inp.addEventListener("input", function () {
        let val = toInternal(this.value);
        let max = currentSize || size;
        if (this.value && (val < 1 || val > max)) {
          this.value = "";
        }
      });

      td.appendChild(inp);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tabla.appendChild(tbody);
  div.appendChild(tabla);
}

function leerTablero(size) {
  let board = crearTablero(size);
  document.querySelectorAll(".hit").forEach(function (inp) {
    let r = parseInt(inp.dataset.row);
    let c = parseInt(inp.dataset.col);
    if (r >= size || c >= size) return;
    let v = inp.value.trim();
    board[r][c] = v ? toInternal(v) : 0;
  });
  return board;
}

function escribirTablero(board) {
  document.querySelectorAll(".hit").forEach(function (inp) {
    let r = parseInt(inp.dataset.row);
    let c = parseInt(inp.dataset.col);
    let v = board[r][c];
    inp.value = v ? toDisplay(v) : "";
  });
}

function bloquearPrefijadas(board) {
  document.querySelectorAll(".hit").forEach(function (inp) {
    let r = parseInt(inp.dataset.row);
    let c = parseInt(inp.dataset.col);
    let fijo = board[r][c] !== 0;
    inp.readOnly = fijo;
    inp.dataset.prefilled = fijo ? "true" : "false";
  });
}

function restaurarPrefijadas(prefilled) {
  document.querySelectorAll(".hit").forEach(function (inp) {
    let r = parseInt(inp.dataset.row);
    let c = parseInt(inp.dataset.col);
    let fijo = prefilled[r] && prefilled[r][c];
    inp.readOnly = fijo;
    inp.dataset.prefilled = fijo ? "true" : "false";
  });
}

function mostrarMensaje(texto, tipo) {
  let msg = document.getElementById("message");
  msg.className = tipo;
  msg.textContent = texto;
}

function limpiarMensaje() {
  let msg = document.getElementById("message");
  msg.className = "";
  msg.textContent = "";
}

// ============================================================
// LOGICA DEL JUEGO
// ============================================================

function iniciarJuego(level) {
  let cfg = CONFIG[level];
  if (!cfg) return;

  limpiarMensaje();
  detenerTimer();

  currentSize = parseInt(level);
  currentSubRows = cfg.subRows;
  currentSubCols = cfg.subCols;

  crearGrid(currentSize, currentSubRows, currentSubCols);

  let puzzle = generarPuzzle(
    currentSize,
    currentSubRows,
    currentSubCols,
    cfg.clues,
  );
  if (!puzzle) {
    mostrarMensaje("Error al generar el puzzle. Intenta de nuevo.", "error");
    return;
  }

  tableroOriginal = copiarTablero(puzzle);
  escribirTablero(puzzle);
  bloquearPrefijadas(puzzle);

  document.getElementById("btn-start").style.display = "none";
  document.getElementById("btn-reiniciar").style.display = "inline-block";
  document.getElementById("level").disabled = true;

  iniciarTimer();
  mostrarMejor(level);
  guardarEstado(puzzle, false);
}

function limpiarJuego() {
  limpiarMensaje();
  detenerTimer();
  borrarEstado();

  let def = CONFIG[DEFAULT_SIZE];
  currentSize = null;
  currentSubRows = null;
  currentSubCols = null;
  tableroOriginal = null;
  crearGrid(DEFAULT_SIZE, def.subRows, def.subCols);

  document.getElementById("btn-start").style.display = "inline-block";
  document.getElementById("btn-reiniciar").style.display = "none";
  document.getElementById("level").disabled = false;

  let timer = document.getElementById("timer");
  if (timer) timer.textContent = "00:00";
  let best = document.getElementById("best-time");
  if (best) best.textContent = "--:--";
}

function resolverJuego() {
  limpiarMensaje();

  let size = currentSize || DEFAULT_SIZE;
  let sr = currentSubRows || CONFIG[DEFAULT_SIZE].subRows;
  let sc = currentSubCols || CONFIG[DEFAULT_SIZE].subCols;

  let board = leerTablero(size);

  // Verificar si esta totalmente vacio
  let vacio = true;
  for (let r = 0; r < size && vacio; r++)
    for (let c = 0; c < size && vacio; c++)
      if (board[r][c] !== 0) vacio = false;

  if (vacio) {
    mostrarMensaje("Primero ingresa numeros o genera un Sudoku.", "info");
    return;
  }

  // Si hay un tablero original, verificar que el usuario haya hecho cambios
  if (tableroOriginal) {
    let sinCambios = true;
    for (let r = 0; r < size && sinCambios; r++)
      for (let c = 0; c < size && sinCambios; c++)
        if (board[r][c] !== tableroOriginal[r][c]) sinCambios = false;

    if (sinCambios) {
      mostrarMensaje(
        "Primero intenta resolverlo tu mismo antes de pedir la solucion.",
        "info",
      );
      return;
    }
  }

  // Validar rango de valores
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (board[r][c] < 0 || board[r][c] > size) {
        mostrarMensaje("Valores invalidos. Usa solo 1-9 y letras.", "error");
        return;
      }

  // Validar repeticiones
  if (!validarTablero(board, sr, sc)) {
    mostrarMensaje(
      "El Sudoku tiene repeticiones en filas, columnas o regiones.",
      "error",
    );
    return;
  }

  // Resolver con backtracking
  let solucion = copiarTablero(board);
  let ok = resolver(solucion, sr, sc);

  if (!ok) {
    mostrarMensaje(
      "No se pudo resolver. Revisa los numeros ingresados.",
      "error",
    );
    return;
  }

  detenerTimer();
  escribirTablero(solucion);
  document.querySelectorAll(".hit").forEach(function (inp) {
    inp.readOnly = true;
  });
  mostrarMensaje("Sudoku resuelto correctamente!", "success");

  if (currentSize) {
    guardarMejor(currentSize);
  }

  guardarEstado(solucion, true);
}

// ============================================================
// EVENTOS
// ============================================================

document.getElementById("level").addEventListener("change", function () {
  document.getElementById("btn-start").disabled = this.value === "-";
});

document.getElementById("btn-start").addEventListener("click", function () {
  let level = document.getElementById("level").value;
  if (level === "-" || !CONFIG[level]) return;
  iniciarJuego(level);
});

document.getElementById("btn-reiniciar").addEventListener("click", function () {
  if (currentSize) iniciarJuego(String(currentSize));
});

document
  .getElementById("btn-resolver")
  .addEventListener("click", resolverJuego);

document.getElementById("btn-limpiar").addEventListener("click", limpiarJuego);

// ============================================================
// INICIO
// ============================================================
window.addEventListener("load", function () {
  let saved = cargarEstado();

  if (saved && saved.board) {
    currentSize = saved.size || saved.board.length;
    currentSubRows = saved.subRows || 3;
    currentSubCols = saved.subCols || 3;
    tableroOriginal = saved.original || null;

    crearGrid(currentSize, currentSubRows, currentSubCols);
    escribirTablero(saved.board);

    if (saved.prefilled) {
      restaurarPrefijadas(saved.prefilled);
    } else {
      bloquearPrefijadas(saved.board);
    }

    if (!saved.solved) {
      segundos = saved.elapsed || 0;
      actualizarTimer();
      iniciarTimer();
    }

    document.getElementById("btn-start").style.display = "none";
    document.getElementById("btn-reiniciar").style.display = "inline-block";
    document.getElementById("level").disabled = true;

    if (currentSize) mostrarMejor(currentSize);
  } else {
    let def = CONFIG[DEFAULT_SIZE];
    crearGrid(DEFAULT_SIZE, def.subRows, def.subCols);
  }
});
