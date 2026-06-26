/**
 * rng.js — Deterministic XOR-shift RNG.
 * No BigInt, no Math.random(). Same seed always produces same sequence.
 */
function RNG(seed) {
  this.s = ((seed ^ 57005) >>> 0) || 1;
}
RNG.prototype.next = function () {
  var s = this.s;
  s ^= s << 13; s ^= s >> 17; s ^= s << 5;
  return (this.s = (s >>> 0));
};
RNG.prototype.int   = function (n) { return n <= 1 ? 0 : this.next() % n; };
RNG.prototype.bool  = function (p) { return this.next() / 4294967295 < p; };
RNG.prototype.range = function (a, b) { return a + this.int(b - a + 1); };
RNG.prototype.shuffle = function (arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = this.int(i + 1);
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
};
