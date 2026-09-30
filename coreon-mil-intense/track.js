/* Rastreamento compartilhado das variantes A/B do COREON.
 * - Marca cada evento com a variante (A ou B)
 * - Repassa UTMs/gclid da URL para o checkout Logzz
 * - Adiciona o código da variante na mensagem do WhatsApp (atendimento por IA)
 * - Dispara eventos no Meta Pixel e no Google Ads
 *
 * GOOGLE ADS: crie duas ações de conversão (Google Ads > Metas > Conversões > Site)
 * e cole os rótulos abaixo, no formato 'AW-18148907605/AbCdEfGh123'.
 * Enquanto estiverem vazios, só os eventos GA4-style (begin_checkout / contact) são enviados.
 */
var CoreonTrack = (function () {
  var ADS_CONV_CHECKOUT = 'AW-18148907605/p5LkCM6Bl4wdENW0ic5D'; // COREON - Clique checkout
  var ADS_CONV_WHATSAPP = 'AW-18148907605/RmM2CNDjl4wdENW0ic5D'; // COREON - Clique WhatsApp
  var WA_NUMBER = '5531983405747';
  var PASS_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid'];

  var variant = '?';

  function params() {
    var out = {}, q = new URLSearchParams(location.search);
    PASS_KEYS.forEach(function (k) { if (q.get(k)) out[k] = q.get(k); });
    try {
      if (Object.keys(out).length) sessionStorage.setItem('coreon_utm', JSON.stringify(out));
      else out = JSON.parse(sessionStorage.getItem('coreon_utm') || '{}');
    } catch (e) {}
    return out;
  }

  // A variante vai em utm_content (anexada ao valor do anúncio, sem apagá-lo)
  function withParams(url) {
    var u = new URL(url), p = params(), tag = 'lp-' + variant.toLowerCase();
    Object.keys(p).forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, p[k]); });
    var c = u.searchParams.get('utm_content');
    u.searchParams.set('utm_content', c ? c + '_' + tag : tag);
    return u.toString();
  }

  function send(kind, label) {
    var data = { variant: variant, event_label: label || '' };
    if (typeof gtag === 'function') {
      gtag('event', kind === 'checkout' ? 'begin_checkout' : 'contact', data);
      var conv = kind === 'checkout' ? ADS_CONV_CHECKOUT : ADS_CONV_WHATSAPP;
      if (conv) gtag('event', 'conversion', { send_to: conv });
    }
    if (typeof fbq === 'function') {
      if (kind === 'checkout') { fbq('track', 'InitiateCheckout', { content_name: 'COREON ' + variant }); fbq('track', 'Lead'); }
      else fbq('track', 'Contact', { content_name: 'COREON ' + variant });
    }
  }

  function waUrl(msg) {
    return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg + ' [cód. ' + variant + ']');
  }

  function bind() {
    document.querySelectorAll('.js-checkout').forEach(function (a) {
      a.href = withParams(a.href);
      a.addEventListener('click', function () { send('checkout', a.textContent.trim()); });
    });
    document.querySelectorAll('.js-wa').forEach(function (a) {
      if (!a.dataset.dynamic) a.href = waUrl(a.dataset.msg || 'Olá! Quero saber mais sobre o COREON.');
      a.addEventListener('click', function () { send('whatsapp', a.dataset.msg || ''); });
    });
  }

  return {
    init: function (v) {
      variant = v;
      if (typeof gtag === 'function') gtag('set', { lp_variant: v });
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
    },
    waUrl: function (msg) { return waUrl(msg); },
    send: send
  };
})();
