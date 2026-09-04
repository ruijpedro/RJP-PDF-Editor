import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

const scan = {
  pages: [],
  active: 0,
  preset: 'handwriting',
  resultText: '',
  confidence: null,
  worker: null,
  busy: false,
  proPages: [],
};

const FIELD_MAP = {
  dataFichaDia: 'P1_texto_001_dia',
  dataFichaMes: 'P1_texto_001_mes',
  dataFichaAno: 'P1_texto_001_ano',
  jaRequereuRsi: 'P1_check_002',
  dataRsiDia: 'P1_texto_003_dia',
  dataRsiMes: 'P1_texto_003_mes',
  dataRsiAno: 'P1_texto_003_ano',
  processoFamiliar: 'P1_texto_004',
  titular: 'P1_check_005',
  requerente: 'P1_check_006',
  iniciativaPropria: 'P1_check_007',
  iniciativaOutro: 'P1_check_008',
  outroQual: 'P1_texto_009',
  nome: 'P1_texto_010',
  dataNascimento: 'P1_texto_011',
  naturalidade: 'P1_texto_012',
  biCc: 'P1_texto_013',
  validadeDia: 'P1_texto_014_dia',
  validadeMes: 'P1_texto_014_mes',
  validadeAno: 'P1_texto_014_ano',
  arquivo: 'P1_texto_015',
  estadoCivil: 'P1_texto_016',
  nacionalidade: 'P1_texto_017',
  beneficiario: 'P1_texto_018',
  contribuinte: 'P1_texto_019',
  morada: 'P1_texto_020',
  codigoPostal1: 'P1_texto_021',
  codigoPostal2: 'P1_texto_022',
  localidade: 'P1_texto_023',
  contactos: 'P1_texto_024',
  agregado1Nome: 'Agregado_L1_C1_132',
  agregado1Parentesco: 'Agregado_L1_C2_133',
  agregado1EstadoCivil: 'Agregado_L1_C3_134',
  agregado1DataNascimento: 'Agregado_L1_C4_135',
  agregado1Profissao: 'Agregado_L1_C5_136',
  agregado1Niss: 'Agregado_L1_C6_137',
  observacoesAgregado: 'P1_observacoes_agregado',
};

const TEMPLATE_FIELDS = [{"name":"P1_texto_001_dia","page":0,"type":"text","rect":[86.9,680.1471,116.9,695.431]},{"name":"P1_texto_001_mes","page":0,"type":"text","rect":[120.2,680.1471,150.2,695.431]},{"name":"P1_texto_001_ano","page":0,"type":"text","rect":[153.5,680.1471,189.5,695.431]},{"name":"P1_check_002","page":0,"type":"checkbox","rect":[122.085,619.029,133.585,630.529]},{"name":"P1_texto_003_dia","page":0,"type":"text","rect":[180.45,619.129,205.45,632.199]},{"name":"P1_texto_003_mes","page":0,"type":"text","rect":[208.2,619.129,233.2,632.199]},{"name":"P1_texto_003_ano","page":0,"type":"text","rect":[235.95,619.129,265.95,632.199]},{"name":"P1_texto_004","page":0,"type":"text","rect":[388.45,619.129,528.45,632.199]},{"name":"P1_check_005","page":0,"type":"checkbox","rect":[85.185,601.729,96.685,613.229]},{"name":"P1_check_006","page":0,"type":"checkbox","rect":[153.235,601.729,164.735,613.229]},{"name":"P1_check_007","page":0,"type":"checkbox","rect":[348.235,601.729,359.735,613.229]},{"name":"P1_check_008","page":0,"type":"checkbox","rect":[426.285,601.729,437.785,613.229]},{"name":"P1_texto_009","page":0,"type":"text","rect":[440.8,601.829,520.8,614.8991]},{"name":"P1_texto_010","page":0,"type":"text","rect":[84.65,584.5291,529.65,597.599]},{"name":"P1_texto_011","page":0,"type":"text","rect":[142.0045,567.229,283.8,580.299]},{"name":"P1_texto_012","page":0,"type":"text","rect":[360.7,567.229,530.7,580.299]},{"name":"P1_texto_013","page":0,"type":"text","rect":[103.8,549.929,193.8,562.999]},{"name":"P1_texto_014_dia","page":0,"type":"text","rect":[290.15,549.929,315.15,562.999]},{"name":"P1_texto_014_mes","page":0,"type":"text","rect":[317.9,549.929,342.9,562.999]},{"name":"P1_texto_014_ano","page":0,"type":"text","rect":[345.65,549.929,380.65,562.999]},{"name":"P1_texto_015","page":0,"type":"text","rect":[433.65,549.929,528.65,562.999]},{"name":"P1_texto_016","page":0,"type":"text","rect":[109.95,532.629,229.95,545.699]},{"name":"P1_texto_017","page":0,"type":"text","rect":[362.95,532.629,527.95,545.699]},{"name":"P1_texto_018","page":0,"type":"text","rect":[122.7,515.329,257.7,528.3991]},{"name":"P1_texto_019","page":0,"type":"text","rect":[369.1,515.329,529.1,528.3991]},{"name":"P1_texto_020","page":0,"type":"text","rect":[91.3,498.029,531.3,511.099]},{"name":"P1_texto_021","page":0,"type":"text","rect":[116.6,480.729,165.0818,493.799]},{"name":"P1_texto_022","page":0,"type":"text","rect":[172.4,480.729,207.4,493.799]},{"name":"P1_texto_023","page":0,"type":"text","rect":[214.9,480.729,299.9,493.799]},{"name":"P1_texto_024","page":0,"type":"text","rect":[100.2,463.429,312.95,476.499]},{"name":"Agregado_L1_C1_132","page":0,"type":"text","rect":[48.8,387.7898,187.8,398.8898]},{"name":"Agregado_L1_C2_133","page":0,"type":"text","rect":[189.8,387.7898,242.0,398.8898]},{"name":"Agregado_L1_C3_134","page":0,"type":"text","rect":[244.0,387.7898,292.2,398.8898]},{"name":"Agregado_L1_C4_135","page":0,"type":"text","rect":[294.2,387.7898,356.0,398.8898]},{"name":"Agregado_L1_C5_136","page":0,"type":"text","rect":[358.0,387.7898,448.1,398.8898]},{"name":"Agregado_L1_C6_137","page":0,"type":"text","rect":[450.1,387.7898,553.3,398.8898]},{"name":"Agregado_L2_C1_138","page":0,"type":"text","rect":[48.8,375.7898,187.8,386.7898]},{"name":"Agregado_L2_C2_139","page":0,"type":"text","rect":[189.8,375.7898,242.0,386.7898]},{"name":"Agregado_L2_C3_140","page":0,"type":"text","rect":[244.0,375.7898,292.2,386.7898]},{"name":"Agregado_L2_C4_141","page":0,"type":"text","rect":[294.2,375.7898,356.0,386.7898]},{"name":"Agregado_L2_C5_142","page":0,"type":"text","rect":[358.0,375.7898,448.1,386.7898]},{"name":"Agregado_L2_C6_143","page":0,"type":"text","rect":[450.1,375.7898,553.3,386.7898]},{"name":"Agregado_L3_C1_144","page":0,"type":"text","rect":[48.8,363.6898,187.8,374.7898]},{"name":"Agregado_L3_C2_145","page":0,"type":"text","rect":[189.8,363.6898,242.0,374.7898]},{"name":"Agregado_L3_C3_146","page":0,"type":"text","rect":[244.0,363.6898,292.2,374.7898]},{"name":"Agregado_L3_C4_147","page":0,"type":"text","rect":[294.2,363.6898,356.0,374.7898]},{"name":"Agregado_L3_C5_148","page":0,"type":"text","rect":[358.0,363.6898,448.1,374.7898]},{"name":"Agregado_L3_C6_149","page":0,"type":"text","rect":[450.1,363.6898,553.3,374.7898]},{"name":"Agregado_L4_C1_150","page":0,"type":"text","rect":[48.8,351.6898,187.8,362.6898]},{"name":"Agregado_L4_C2_151","page":0,"type":"text","rect":[189.8,351.6898,242.0,362.6898]},{"name":"Agregado_L4_C3_152","page":0,"type":"text","rect":[244.0,351.6898,292.2,362.6898]},{"name":"Agregado_L4_C4_153","page":0,"type":"text","rect":[294.2,351.6898,356.0,362.6898]},{"name":"Agregado_L4_C5_154","page":0,"type":"text","rect":[358.0,351.6898,448.1,362.6898]},{"name":"Agregado_L4_C6_155","page":0,"type":"text","rect":[450.1,351.6898,553.3,362.6898]},{"name":"Agregado_L5_C1_156","page":0,"type":"text","rect":[48.8,339.5898,187.8,350.6898]},{"name":"Agregado_L5_C2_157","page":0,"type":"text","rect":[189.8,339.5898,242.0,350.6898]},{"name":"Agregado_L5_C3_158","page":0,"type":"text","rect":[244.0,339.5898,292.2,350.6898]},{"name":"Agregado_L5_C4_159","page":0,"type":"text","rect":[294.2,339.5898,356.0,350.6898]},{"name":"Agregado_L5_C5_160","page":0,"type":"text","rect":[358.0,339.5898,448.1,350.6898]},{"name":"Agregado_L5_C6_161","page":0,"type":"text","rect":[450.1,339.5898,553.3,350.6898]},{"name":"Agregado_L6_C1_162","page":0,"type":"text","rect":[48.8,327.5898,187.8,338.5898]},{"name":"Agregado_L6_C2_163","page":0,"type":"text","rect":[189.8,327.5898,242.0,338.5898]},{"name":"Agregado_L6_C3_164","page":0,"type":"text","rect":[244.0,327.5898,292.2,338.5898]},{"name":"Agregado_L6_C4_165","page":0,"type":"text","rect":[294.2,327.5898,356.0,338.5898]},{"name":"Agregado_L6_C5_166","page":0,"type":"text","rect":[358.0,327.5898,448.1,338.5898]},{"name":"Agregado_L6_C6_167","page":0,"type":"text","rect":[450.1,327.5898,553.3,338.5898]},{"name":"Agregado_L7_C1_168","page":0,"type":"text","rect":[48.8,315.4898,187.8,326.5898]},{"name":"Agregado_L7_C2_169","page":0,"type":"text","rect":[189.8,315.4898,242.0,326.5898]},{"name":"Agregado_L7_C3_170","page":0,"type":"text","rect":[244.0,315.4898,292.2,326.5898]},{"name":"Agregado_L7_C4_171","page":0,"type":"text","rect":[294.2,315.4898,356.0,326.5898]},{"name":"Agregado_L7_C5_172","page":0,"type":"text","rect":[358.0,315.4898,448.1,326.5898]},{"name":"Agregado_L7_C6_173","page":0,"type":"text","rect":[450.1,315.4898,553.3,326.5898]},{"name":"P2_check_025","page":1,"type":"checkbox","rect":[188.135,700.029,199.635,711.529]},{"name":"P2_check_026","page":1,"type":"checkbox","rect":[229.835,700.029,241.335,711.529]},{"name":"P2_check_027","page":1,"type":"checkbox","rect":[318.185,700.029,329.685,711.529]},{"name":"P2_check_028","page":1,"type":"checkbox","rect":[359.885,700.029,371.385,711.529]},{"name":"P2_check_029","page":1,"type":"checkbox","rect":[481.835,700.029,493.335,711.529]},{"name":"P2_check_030","page":1,"type":"checkbox","rect":[138.385,682.729,149.885,694.229]},{"name":"P2_check_031","page":1,"type":"checkbox","rect":[265.035,682.729,276.535,694.229]},{"name":"P2_texto_032","page":1,"type":"text","rect":[384.5,682.829,504.5,695.8991]},{"name":"P2_texto_033","page":1,"type":"text","rect":[165.95,665.5291,330.95,678.599]},{"name":"P2_texto_034","page":1,"type":"text","rect":[388.2,665.5291,508.2,678.599]},{"name":"P2_texto_035","page":1,"type":"text","rect":[137.6,648.229,507.6,661.299]},{"name":"P2_texto_036","page":1,"type":"text","rect":[85.15,630.929,510.15,643.999]},{"name":"P2_texto_037","page":1,"type":"text","rect":[85.15,613.629,510.15,626.699]},{"name":"P2_texto_038","page":1,"type":"text","rect":[85.15,596.329,510.15,609.3991]},{"name":"P2_texto_039","page":1,"type":"text","rect":[85.15,579.0291,510.15,592.099]},{"name":"P2_check_040","page":1,"type":"checkbox","rect":[104.535,503.479,116.035,514.979]},{"name":"P2_texto_041","page":1,"type":"text","rect":[146.5,503.579,214.4187,516.6491]},{"name":"P2_texto_042","page":1,"type":"text","rect":[240.4181,503.579,310.4237,516.6491]},{"name":"P2_texto_043","page":1,"type":"text","rect":[350.3,503.579,402.8213,516.6491]},{"name":"P2_texto_044_dia","page":1,"type":"text","rect":[449.66,503.579,459.66,516.6491]},{"name":"P2_texto_044_mes","page":1,"type":"text","rect":[462.45,503.579,472.45,516.6491]},{"name":"P2_texto_044_ano","page":1,"type":"text","rect":[475.2,503.579,485.2,516.6491]},{"name":"P2_texto_045","page":1,"type":"text","rect":[147.6,486.279,210.5293,499.349]},{"name":"P2_texto_046","page":1,"type":"text","rect":[239.0181,486.279,309.0237,499.349]},{"name":"P2_texto_047","page":1,"type":"text","rect":[348.9,486.279,403.9,499.349]},{"name":"P2_texto_048_dia","page":1,"type":"text","rect":[450.76,486.279,460.76,499.349]},{"name":"P2_texto_048_mes","page":1,"type":"text","rect":[463.55,486.279,473.55,499.349]},{"name":"P2_texto_048_ano","page":1,"type":"text","rect":[476.3,486.279,486.3,499.349]},{"name":"P2_check_049","page":1,"type":"checkbox","rect":[105.085,468.879,116.585,480.379]},{"name":"P2_texto_050","page":1,"type":"text","rect":[122.1,468.979,212.1,482.049]},{"name":"P2_check_051","page":1,"type":"checkbox","rect":[337.885,468.879,349.385,480.379]},{"name":"P2_check_052","page":1,"type":"checkbox","rect":[369.585,468.879,381.085,480.379]},{"name":"P2_check_053","page":1,"type":"checkbox","rect":[474.585,468.879,486.085,480.379]},{"name":"P2_check_054","page":1,"type":"checkbox","rect":[172.1125,451.579,183.6125,463.079]},{"name":"P2_texto_055","page":1,"type":"text","rect":[212.6,451.679,292.6,464.749]},{"name":"P2_texto_056","page":1,"type":"text","rect":[333.95,451.679,493.95,464.749]},{"name":"P2_check_057","page":1,"type":"checkbox","rect":[169.535,434.279,181.035,445.779]},{"name":"P2_texto_058","page":1,"type":"text","rect":[211.25,434.379,279.1687,447.449]},{"name":"P2_check_059","page":1,"type":"checkbox","rect":[303.685,434.279,315.185,445.779]},{"name":"P2_check_060","page":1,"type":"checkbox","rect":[440.65,434.279,452.15,445.779]},{"name":"P2_check_061","page":1,"type":"checkbox","rect":[479.7925,434.279,491.2925,445.779]},{"name":"P2_texto_062","page":1,"type":"text","rect":[197.8856,399.779,505.95,412.849]},{"name":"P2_texto_063","page":1,"type":"text","rect":[85.15,382.479,510.15,395.549]},{"name":"P2_texto_064","page":1,"type":"text","rect":[85.15,365.179,510.15,378.249]},{"name":"P2_texto_065","page":1,"type":"text","rect":[228.45,330.579,508.45,343.649]},{"name":"P2_texto_066","page":1,"type":"text","rect":[85.15,313.279,510.15,326.349]},{"name":"P2_texto_067","page":1,"type":"text","rect":[85.15,295.9791,510.15,309.049]},{"name":"P2_check_068","page":1,"type":"checkbox","rect":[185.635,241.129,197.135,252.629]},{"name":"P2_check_069","page":1,"type":"checkbox","rect":[229.835,241.129,241.335,252.629]},{"name":"P2_texto_070","page":1,"type":"text","rect":[114.55,223.929,282.3837,236.999]},{"name":"P2_texto_071","page":1,"type":"text","rect":[309.5,223.929,332.6417,236.999]},{"name":"P2_texto_072","page":1,"type":"text","rect":[364.4864,223.929,389.2227,236.999]},{"name":"P2_texto_073","page":1,"type":"text","rect":[418.9,223.929,498.9,236.999]},{"name":"P2_texto_074","page":1,"type":"text","rect":[114.9107,206.629,501.8,219.699]},{"name":"P2_texto_075","page":1,"type":"text","rect":[114.55,189.329,282.3837,202.399]},{"name":"P2_texto_076","page":1,"type":"text","rect":[309.5,189.329,332.6417,202.399]},{"name":"P2_texto_077","page":1,"type":"text","rect":[364.4864,189.329,389.2227,202.399]},{"name":"P2_texto_078","page":1,"type":"text","rect":[418.9,189.329,498.9,202.399]},{"name":"P2_texto_079","page":1,"type":"text","rect":[114.9107,172.029,501.8,185.0989]},{"name":"P2_texto_080","page":1,"type":"text","rect":[114.55,154.7291,282.3837,167.799]},{"name":"P2_texto_081","page":1,"type":"text","rect":[309.5,154.7291,332.6417,167.799]},{"name":"P2_texto_082","page":1,"type":"text","rect":[364.4864,154.7291,389.2227,167.799]},{"name":"P2_texto_083","page":1,"type":"text","rect":[418.9,154.7291,498.9,167.799]},{"name":"P2_texto_084","page":1,"type":"text","rect":[114.9107,137.429,501.8,150.499]},{"name":"P2_texto_085","page":1,"type":"text","rect":[141.5,120.129,506.5,133.199]},{"name":"P2_texto_086","page":1,"type":"text","rect":[85.15,102.829,510.15,115.899]},{"name":"P2_texto_087","page":1,"type":"text","rect":[85.15,85.529,510.15,98.599]},{"name":"P3_check_088","page":2,"type":"checkbox","rect":[195.085,696.629,206.585,708.129]},{"name":"P3_check_089","page":2,"type":"checkbox","rect":[226.785,696.629,238.285,708.129]},{"name":"P3_check_090","page":2,"type":"checkbox","rect":[160.47,307.223,170.086,316.8391]},{"name":"P3_check_091","page":2,"type":"checkbox","rect":[187.82,307.223,197.436,316.8391]},{"name":"P3_texto_092","page":2,"type":"text","rect":[141.0,111.361,509.0,122.217]},{"name":"P3_texto_093","page":2,"type":"text","rect":[85.15,95.9109,509.15,106.767]},{"name":"P3_texto_094","page":2,"type":"text","rect":[85.15,82.111,509.15,92.967]},{"name":"P3_texto_095","page":2,"type":"text","rect":[85.15,68.311,509.15,79.167]},{"name":"Rend_L1_C1_174","page":2,"type":"text","rect":[212.5,638.8898,264.5,654.4898]},{"name":"Rend_L1_C2_175","page":2,"type":"text","rect":[266.5,638.8898,327.5,654.4898]},{"name":"Rend_L1_C3_176","page":2,"type":"text","rect":[329.5,638.8898,399.5,654.4898]},{"name":"Rend_L1_C4_177","page":2,"type":"text","rect":[401.5,638.8898,516.5,654.4898]},{"name":"Rend_L2_C1_178","page":2,"type":"text","rect":[212.5,622.3898,264.5,637.8898]},{"name":"Rend_L2_C2_179","page":2,"type":"text","rect":[266.5,622.3898,327.5,637.8898]},{"name":"Rend_L2_C3_180","page":2,"type":"text","rect":[329.5,622.3898,399.5,637.8898]},{"name":"Rend_L2_C4_181","page":2,"type":"text","rect":[401.5,622.3898,516.5,637.8898]},{"name":"Rend_L3_C1_182","page":2,"type":"text","rect":[212.5,581.6898,264.5,621.3898]},{"name":"Rend_L3_C2_183","page":2,"type":"text","rect":[266.5,581.6898,327.5,621.3898]},{"name":"Rend_L3_C3_184","page":2,"type":"text","rect":[329.5,581.6898,399.5,621.3898]},{"name":"Rend_L3_C4_185","page":2,"type":"text","rect":[401.5,581.6898,516.5,621.3898]},{"name":"Rend_L4_C1_186","page":2,"type":"text","rect":[212.5,565.0899,264.5,580.6898]},{"name":"Rend_L4_C2_187","page":2,"type":"text","rect":[266.5,565.0899,327.5,580.6898]},{"name":"Rend_L4_C3_188","page":2,"type":"text","rect":[329.5,565.0899,399.5,580.6898]},{"name":"Rend_L4_C4_189","page":2,"type":"text","rect":[401.5,565.0899,516.5,580.6898]},{"name":"Rend_L5_C1_190","page":2,"type":"text","rect":[212.5,548.5899,264.5,564.0899]},{"name":"Rend_L5_C2_191","page":2,"type":"text","rect":[266.5,548.5899,327.5,564.0899]},{"name":"Rend_L5_C3_192","page":2,"type":"text","rect":[329.5,548.5899,399.5,564.0899]},{"name":"Rend_L5_C4_193","page":2,"type":"text","rect":[401.5,548.5899,516.5,564.0899]},{"name":"Rend_L6_C1_194","page":2,"type":"text","rect":[212.5,531.9898,264.5,547.5899]},{"name":"Rend_L6_C2_195","page":2,"type":"text","rect":[266.5,531.9898,327.5,547.5899]},{"name":"Rend_L6_C3_196","page":2,"type":"text","rect":[329.5,531.9898,399.5,547.5899]},{"name":"Rend_L6_C4_197","page":2,"type":"text","rect":[401.5,531.9898,516.5,547.5899]},{"name":"Rend_L7_C1_198","page":2,"type":"text","rect":[212.5,503.9898,264.5,530.9898]},{"name":"Rend_L7_C2_199","page":2,"type":"text","rect":[266.5,503.9898,327.5,530.9898]},{"name":"Rend_L7_C3_200","page":2,"type":"text","rect":[329.5,503.9898,399.5,530.9898]},{"name":"Rend_L7_C4_201","page":2,"type":"text","rect":[401.5,503.9898,516.5,530.9898]},{"name":"Rend_L8_C1_202","page":2,"type":"text","rect":[212.5,487.3898,264.5,502.9898]},{"name":"Rend_L8_C2_203","page":2,"type":"text","rect":[266.5,487.3898,327.5,502.9898]},{"name":"Rend_L8_C3_204","page":2,"type":"text","rect":[329.5,487.3898,399.5,502.9898]},{"name":"Rend_L8_C4_205","page":2,"type":"text","rect":[401.5,487.3898,516.5,502.9898]},{"name":"Rend_L9_C1_206","page":2,"type":"text","rect":[212.5,459.3898,264.5,486.3898]},{"name":"Rend_L9_C2_207","page":2,"type":"text","rect":[266.5,459.3898,327.5,486.3898]},{"name":"Rend_L9_C3_208","page":2,"type":"text","rect":[329.5,459.3898,399.5,486.3898]},{"name":"Rend_L9_C4_209","page":2,"type":"text","rect":[401.5,459.3898,516.5,486.3898]},{"name":"Rend_L10_C1_210","page":2,"type":"text","rect":[212.5,442.7898,264.5,458.3898]},{"name":"Rend_L10_C2_211","page":2,"type":"text","rect":[266.5,442.7898,327.5,458.3898]},{"name":"Rend_L10_C3_212","page":2,"type":"text","rect":[329.5,442.7898,399.5,458.3898]},{"name":"Rend_L10_C4_213","page":2,"type":"text","rect":[401.5,442.7898,516.5,458.3898]},{"name":"Rend_L11_C1_214","page":2,"type":"text","rect":[212.5,404.3898,264.5,441.7898]},{"name":"Rend_L11_C2_215","page":2,"type":"text","rect":[266.5,404.3898,327.5,441.7898]},{"name":"Rend_L11_C3_216","page":2,"type":"text","rect":[329.5,404.3898,399.5,441.7898]},{"name":"Rend_L11_C4_217","page":2,"type":"text","rect":[401.5,404.3898,516.5,441.7898]},{"name":"Rend_L12_C1_218","page":2,"type":"text","rect":[212.5,387.8898,264.5,403.3898]},{"name":"Rend_L12_C2_219","page":2,"type":"text","rect":[266.5,387.8898,327.5,403.3898]},{"name":"Rend_L12_C3_220","page":2,"type":"text","rect":[329.5,387.8898,399.5,403.3898]},{"name":"Rend_L12_C4_221","page":2,"type":"text","rect":[401.5,387.8898,516.5,403.3898]},{"name":"Rend_L13_C1_222","page":2,"type":"text","rect":[212.5,371.2898,264.5,386.8898]},{"name":"Rend_L13_C2_223","page":2,"type":"text","rect":[266.5,371.2898,327.5,386.8898]},{"name":"Rend_L13_C3_224","page":2,"type":"text","rect":[329.5,371.2898,399.5,386.8898]},{"name":"Rend_L13_C4_225","page":2,"type":"text","rect":[401.5,371.2898,516.5,386.8898]},{"name":"Rend_L14_C1_226","page":2,"type":"text","rect":[212.5,352.3898,264.5,370.2898]},{"name":"Rend_L14_C2_227","page":2,"type":"text","rect":[266.5,352.3898,327.5,370.2898]},{"name":"Rend_L14_C3_228","page":2,"type":"text","rect":[329.5,352.3898,399.5,370.2898]},{"name":"Rend_L14_C4_229","page":2,"type":"text","rect":[401.5,352.3898,516.5,370.2898]},{"name":"Desp_L1_C1_230","page":2,"type":"text","rect":[194.3,265.7898,241.9,283.6898]},{"name":"Desp_L1_C2_231","page":2,"type":"text","rect":[243.9,265.7898,294.6,283.6898]},{"name":"Desp_L1_C3_232","page":2,"type":"text","rect":[296.6,265.7898,363.6,283.6898]},{"name":"Desp_L1_C4_233","page":2,"type":"text","rect":[365.6,265.7898,516.4,283.6898]},{"name":"Desp_L2_C1_234","page":2,"type":"text","rect":[194.3,246.9897,241.9,264.7898]},{"name":"Desp_L2_C2_235","page":2,"type":"text","rect":[243.9,246.9897,294.6,264.7898]},{"name":"Desp_L2_C3_236","page":2,"type":"text","rect":[296.6,246.9897,363.6,264.7898]},{"name":"Desp_L2_C4_237","page":2,"type":"text","rect":[365.6,246.9897,516.4,264.7898]},{"name":"Desp_L3_C1_238","page":2,"type":"text","rect":[194.3,227.0898,241.9,245.9897]},{"name":"Desp_L3_C2_239","page":2,"type":"text","rect":[243.9,227.0898,294.6,245.9897]},{"name":"Desp_L3_C3_240","page":2,"type":"text","rect":[296.6,227.0898,363.6,245.9897]},{"name":"Desp_L3_C4_241","page":2,"type":"text","rect":[365.6,227.0898,516.4,245.9897]},{"name":"Desp_L4_C1_242","page":2,"type":"text","rect":[194.3,208.2898,241.9,226.0898]},{"name":"Desp_L4_C2_243","page":2,"type":"text","rect":[243.9,208.2898,294.6,226.0898]},{"name":"Desp_L4_C3_244","page":2,"type":"text","rect":[296.6,208.2898,363.6,226.0898]},{"name":"Desp_L4_C4_245","page":2,"type":"text","rect":[365.6,208.2898,516.4,226.0898]},{"name":"Desp_L5_C1_246","page":2,"type":"text","rect":[194.3,189.3898,241.9,207.2898]},{"name":"Desp_L5_C2_247","page":2,"type":"text","rect":[243.9,189.3898,294.6,207.2898]},{"name":"Desp_L5_C3_248","page":2,"type":"text","rect":[296.6,189.3898,363.6,207.2898]},{"name":"Desp_L5_C4_249","page":2,"type":"text","rect":[365.6,189.3898,516.4,207.2898]},{"name":"Desp_L6_C1_250","page":2,"type":"text","rect":[194.3,170.5898,241.9,188.3898]},{"name":"Desp_L6_C2_251","page":2,"type":"text","rect":[243.9,170.5898,294.6,188.3898]},{"name":"Desp_L6_C3_252","page":2,"type":"text","rect":[296.6,170.5898,363.6,188.3898]},{"name":"Desp_L6_C4_253","page":2,"type":"text","rect":[365.6,170.5898,516.4,188.3898]},{"name":"Desp_L7_C1_254","page":2,"type":"text","rect":[194.3,151.6898,241.9,169.5898]},{"name":"Desp_L7_C2_255","page":2,"type":"text","rect":[243.9,151.6898,294.6,169.5898]},{"name":"Desp_L7_C3_256","page":2,"type":"text","rect":[296.6,151.6898,363.6,169.5898]},{"name":"Desp_L7_C4_257","page":2,"type":"text","rect":[365.6,151.6898,516.4,169.5898]},{"name":"Desp_L8_C1_258","page":2,"type":"text","rect":[194.3,137.3898,241.9,150.6898]},{"name":"Desp_L8_C2_259","page":2,"type":"text","rect":[243.9,137.3898,294.6,150.6898]},{"name":"Desp_L8_C3_260","page":2,"type":"text","rect":[296.6,137.3898,363.6,150.6898]},{"name":"Desp_L8_C4_261","page":2,"type":"text","rect":[365.6,137.3898,516.4,150.6898]},{"name":"P4_check_096","page":3,"type":"checkbox","rect":[176.735,681.229,188.235,692.729]},{"name":"P4_check_097","page":3,"type":"checkbox","rect":[208.435,681.229,219.935,692.729]},{"name":"P4_check_098","page":3,"type":"checkbox","rect":[285.635,681.229,297.135,692.729]},{"name":"P4_check_099","page":3,"type":"checkbox","rect":[317.335,681.229,328.835,692.729]},{"name":"P4_check_100","page":3,"type":"checkbox","rect":[428.7113,681.229,440.2113,692.729]},{"name":"P4_check_101","page":3,"type":"checkbox","rect":[457.085,681.229,468.585,692.729]},{"name":"P4_texto_102","page":3,"type":"text","rect":[141.5,664.0291,506.5,677.099]},{"name":"P4_texto_103","page":3,"type":"text","rect":[85.15,646.729,510.15,659.799]},{"name":"P4_texto_104","page":3,"type":"text","rect":[85.15,629.429,510.15,642.499]},{"name":"P4_texto_105","page":3,"type":"text","rect":[85.15,573.511,509.15,584.367]},{"name":"P4_texto_106","page":3,"type":"text","rect":[85.15,559.7111,509.15,570.567]},{"name":"P4_texto_107","page":3,"type":"text","rect":[85.15,545.911,509.15,556.767]},{"name":"P4_texto_108","page":3,"type":"text","rect":[85.15,532.111,509.15,542.9671]},{"name":"P4_texto_109","page":3,"type":"text","rect":[85.15,518.3111,509.15,529.167]},{"name":"P4_texto_110","page":3,"type":"text","rect":[85.15,504.511,509.15,515.367]},{"name":"P4_texto_111","page":3,"type":"text","rect":[85.15,490.711,509.15,501.567]},{"name":"P4_texto_112","page":3,"type":"text","rect":[85.15,476.911,509.15,487.767]},{"name":"P4_texto_113","page":3,"type":"text","rect":[85.15,463.111,509.15,473.967]},{"name":"P4_texto_114","page":3,"type":"text","rect":[85.15,449.311,509.15,460.167]},{"name":"P4_texto_115","page":3,"type":"text","rect":[85.15,435.511,509.15,446.367]},{"name":"P4_texto_116","page":3,"type":"text","rect":[85.15,421.711,509.15,432.567]},{"name":"P4_texto_117","page":3,"type":"text","rect":[85.15,407.911,509.15,418.767]},{"name":"P4_texto_118","page":3,"type":"text","rect":[85.15,394.111,509.15,404.967]},{"name":"P4_texto_119","page":3,"type":"text","rect":[85.15,380.311,509.15,391.167]},{"name":"P4_texto_120","page":3,"type":"text","rect":[85.15,366.511,509.15,377.367]},{"name":"P4_texto_121","page":3,"type":"text","rect":[85.15,352.711,509.15,363.567]},{"name":"P4_texto_122","page":3,"type":"text","rect":[85.15,338.911,509.15,349.767]},{"name":"P4_texto_123","page":3,"type":"text","rect":[85.15,325.111,509.15,335.967]},{"name":"P4_texto_124","page":3,"type":"text","rect":[85.15,311.311,509.15,322.167]},{"name":"P6_texto_125","page":5,"type":"text","rect":[99.0,669.6898,431.0,683.3898]},{"name":"P6_texto_126","page":5,"type":"text","rect":[214.0,652.3898,299.0,666.0898]},{"name":"P6_texto_127_dia","page":5,"type":"text","rect":[383.0,652.3898,402.0,666.0898]},{"name":"P6_texto_127_mes","page":5,"type":"text","rect":[405.0,652.3898,423.0,666.0898]},{"name":"P6_texto_127_ano","page":5,"type":"text","rect":[426.0,652.3898,444.0,666.0898]},{"name":"P7_texto_128","page":5,"type":"text","rect":[181.0,236.8898,202.0,250.8898]},{"name":"P7_texto_129","page":5,"type":"text","rect":[215.0,236.8898,281.0,250.8898]},{"name":"P7_texto_130","page":5,"type":"text","rect":[295.0,236.8898,326.0,250.8898]},{"name":"P7_texto_131","page":5,"type":"text","rect":[135.0,167.8898,461.0,181.8898]}];

const PDF_W = 595.28;
const PDF_H = 841.89;
const TEMPLATE_FIELD_SET = new Set(TEMPLATE_FIELDS.map(f=>f.name));

const FIELD_LABELS = {
  P2_check_025:'Saúde — Problemas de Saúde: Sim', P2_check_026:'Saúde — Problemas de Saúde: Não',
  P2_check_027:'Saúde — Isento: Sim', P2_check_028:'Saúde — Isento: Não', P2_check_029:'Saúde — Existe Gravidez',
  P2_check_030:'Saúde — Deficiências', P2_check_031:'Saúde — Dependente/Acamado',
  P2_texto_032:'Saúde — Unidade Saúde Familiar', P2_texto_033:'Saúde — Médico de Família', P2_texto_034:'Saúde — N.º Utente',
  P2_texto_035:'Saúde — Observação 1', P2_texto_036:'Saúde — Observação 2', P2_texto_037:'Saúde — Observação 3', P2_texto_038:'Saúde — Observação 4', P2_texto_039:'Saúde — Observação 5',
  P2_check_040:'Trabalho — Atividade profissional: Sim', P2_texto_041:'Trabalho — Quem 1', P2_texto_042:'Trabalho — Qual 1', P2_texto_043:'Trabalho — Entidade 1',
  P2_texto_044_dia:'Trabalho — Data início 1: dia', P2_texto_044_mes:'Trabalho — Data início 1: mês', P2_texto_044_ano:'Trabalho — Data início 1: ano',
  P2_texto_045:'Trabalho — Quem 2', P2_texto_046:'Trabalho — Qual 2', P2_texto_047:'Trabalho — Entidade 2',
  P2_texto_048_dia:'Trabalho — Data início 2: dia', P2_texto_048_mes:'Trabalho — Data início 2: mês', P2_texto_048_ano:'Trabalho — Data início 2: ano',
  P2_check_049:'Trabalho — Atividade profissional: Não', P2_texto_050:'Trabalho — Situação sem atividade',
  P2_check_051:'Trabalho — Inscrito C. Emprego: Sim', P2_check_052:'Trabalho — Inscrito C. Emprego: Não', P2_check_053:'Trabalho — Declaração',
  P2_check_054:'Trabalho — Dispensa de Inscrição', P2_texto_055:'Trabalho — Dispensa: quem', P2_texto_056:'Trabalho — Dispensa: motivo',
  P2_check_057:'Trabalho — Carta condução: Sim', P2_texto_058:'Trabalho — Carta condução: quem', P2_check_059:'Trabalho — Carta condução: Não',
  P2_check_060:'Trabalho — Carro próprio: Sim', P2_check_061:'Trabalho — Carro próprio: Não',
  P2_texto_062:'Trabalho — Experiência profissional 1', P2_texto_063:'Trabalho — Experiência profissional 2', P2_texto_064:'Trabalho — Experiência profissional 3',
  P2_texto_065:'Trabalho — Aptidões/interesses 1', P2_texto_066:'Trabalho — Aptidões/interesses 2', P2_texto_067:'Trabalho — Aptidões/interesses 3',
  P2_check_068:'Escolar — Frequenta ensino: Sim', P2_check_069:'Escolar — Frequenta ensino: Não',
  P2_texto_070:'Escolar 1 — Quem', P2_texto_071:'Escolar 1 — Ano', P2_texto_072:'Escolar 1 — Turma', P2_texto_073:'Escolar 1 — Professor', P2_texto_074:'Escolar 1 — Escola',
  P2_texto_075:'Escolar 2 — Quem', P2_texto_076:'Escolar 2 — Ano', P2_texto_077:'Escolar 2 — Turma', P2_texto_078:'Escolar 2 — Professor', P2_texto_079:'Escolar 2 — Escola',
  P2_texto_080:'Escolar 3 — Quem', P2_texto_081:'Escolar 3 — Ano', P2_texto_082:'Escolar 3 — Turma', P2_texto_083:'Escolar 3 — Professor', P2_texto_084:'Escolar 3 — Escola',
  P2_texto_085:'Escolar — Observações 1', P2_texto_086:'Escolar — Observações 2', P2_texto_087:'Escolar — Observações 3',
  P3_check_088:'Económica — Existem Rendimentos: Sim', P3_check_089:'Económica — Existem Rendimentos: Não',
  P3_check_090:'Económica — Existem Despesas: Sim', P3_check_091:'Económica — Existem Despesas: Não',
  P3_texto_092:'Económica — Observações 1', P3_texto_093:'Económica — Observações 2', P3_texto_094:'Económica — Observações 3', P3_texto_095:'Económica — Observações 4',
  P4_check_096:'Habitacional — Existe Habitação: Sim', P4_check_097:'Habitacional — Existe Habitação: Não',
  P4_check_098:'Habitacional — Própria: Sim', P4_check_099:'Habitacional — Própria: Não', P4_check_100:'Habitacional — Habitação Social: Sim', P4_check_101:'Habitacional — Habitação Social: Não',
  P4_texto_102:'Habitacional — Observações 1', P4_texto_103:'Habitacional — Observações 2', P4_texto_104:'Habitacional — Observações 3',
  P6_texto_125:'Consentimento — Nome', P6_texto_126:'Consentimento — Documento de identificação',
  P6_texto_127_dia:'Consentimento — Validade: dia', P6_texto_127_mes:'Consentimento — Validade: mês', P6_texto_127_ano:'Consentimento — Validade: ano',
  P7_texto_128:'Data final — dia', P7_texto_129:'Data final — mês', P7_texto_130:'Data final — ano', P7_texto_131:'Assinatura'
};
const REND_ROWS=['Trabalho','Reforma','Pensão/Pensão social','RSI','Comp. Dependência','CSI','Prestações Familiares','Apoios Familiares','Prestações Sociais','Bolsas de Formação','Apoio especiais','Bens Imóveis/Móveis','Outros','Total'];
const REND_COLS=['Declarado','Confirmado','Elemento do Agregado','Descrição'];
const DESP_ROWS=['Água','Luz','Gás','Renda','Transportes','Despesas Saúde','Outros','Total'];
const DESP_COLS=['Declarado','Confirmado','Situação dívida','Descrição'];

function directFieldLabel(name){
  if(FIELD_LABELS[name]) return FIELD_LABELS[name];
  let m=name.match(/^Agregado_L(\d+)_C(\d+)_/); if(m){const cols=['Nome','Parentesco','Est. civil','Data Nas.','Profissão/Ensino','NISS'];return `Agregado ${m[1]} — ${cols[Number(m[2])-1]}`;}
  m=name.match(/^Rend_L(\d+)_C(\d+)_/); if(m)return `Rendimentos — ${REND_ROWS[Number(m[1])-1]||('Linha '+m[1])} — ${REND_COLS[Number(m[2])-1]||('Coluna '+m[2])}`;
  m=name.match(/^Desp_L(\d+)_C(\d+)_/); if(m)return `Despesas — ${DESP_ROWS[Number(m[1])-1]||('Linha '+m[1])} — ${DESP_COLS[Number(m[2])-1]||('Coluna '+m[2])}`;
  m=name.match(/^P4_texto_(\d+)/); if(m && Number(m[1])>=105)return `Observações gerais — linha ${Number(m[1])-104}`;
  return name;
}

function e(s=''){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function modal(){
  if(document.querySelector('#scannerModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
  <div id="scannerModal" class="scanner-modal" hidden>
    <div class="scanner-panel">
      <header class="scanner-head"><div><strong>RJP Scanner Pro</strong><small>Digitalização + OCR de fichas manuscritas</small></div><button id="scanClose" aria-label="Fechar">✕</button></header>
      <div class="scanner-actions">
        <label class="button primary">📥 Importar ficheiros<input id="scanFiles" type="file" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.bmp" multiple hidden></label>
        <label class="button">📁 Importar pasta<input id="scanFolder" type="file" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.bmp" webkitdirectory directory multiple hidden></label>
        <label class="button">📷 Fotografar<input id="scanCamera" type="file" accept="image/*" capture="environment" hidden></label>
        <button id="scanRotate">↻ Rodar</button>
        <button id="scanAutoCrop">✂ Auto recorte</button>
        <select id="scanPreset"><option value="handwriting">Manuscrito</option><option value="document">Documento</option><option value="photo">Fotografia</option></select>
        <button id="scanEnhance">✨ Melhorar</button>
        <span class="sep"></span>
        <button id="scanOcrPro" class="primary">OCR</button>
        <button id="scanSettings" title="Configuração do OCR">⚙</button>
        <button id="scanOcr" hidden aria-hidden="true">OCR Local</button>
      </div>
      <div id="scanStatus" class="scanner-status scan-dropzone">Arrasta para aqui PDFs ou imagens digitalizadas, ou usa “Importar ficheiros”.</div>
      <div class="scanner-body">
        <aside><div id="scanThumbs" class="scan-thumbs"></div></aside>
        <section class="scan-stage"><canvas id="scanCanvas"></canvas><div class="scan-hint">Dica: fotografa a folha direita, sem sombras e ocupando quase todo o enquadramento.</div></section>
        <section class="ocr-review">
          <div class="review-head"><strong>Texto reconhecido</strong><span id="scanConfidence"></span></div>
          <textarea id="scanText" spellcheck="false" placeholder="O texto reconhecido aparece aqui para revisão antes de preencher a ficha."></textarea>
          <div id="scanExtracted" class="extracted"></div>
          <div class="review-buttons"><button id="scanExtract">Extrair campos</button><button id="scanFill" class="primary">Preencher ficha atual</button><button id="scanCopy">Copiar texto</button></div>
        </section>
      </div>
    </div>
  </div>
  <dialog id="ocrSettingsDialog" class="ocr-dialog">
    <form method="dialog"><h3>OCR Pro — endpoint seguro</h3><p>Para manuscritos, usa OCR Manuscrito Pro. O processamento recomendado é Google Cloud Vision DOCUMENT_TEXT_DETECTION através de um proxy seguro. A chave fica no servidor, nunca no GitHub.</p>
      <label>Endpoint<input id="ocrEndpoint" placeholder="https://script.google.com/macros/s/.../exec"></label>
      <label>Token do proxy<input id="ocrToken" type="password" autocomplete="off"></label>
      <div class="dialog-actions"><button value="cancel">Cancelar</button><button id="ocrSaveSettings" value="default" class="primary">Guardar</button></div>
    </form>
  </dialog>`);
}

function setStatus(t){const n=document.querySelector('#scanStatus');if(n)n.textContent=t;}
function dataUrlFromBlob(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob);});}
function imageFromUrl(url){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});}
async function canvasToBlob(canvas,type='image/jpeg',quality=.94){return new Promise(r=>canvas.toBlob(r,type,quality));}

async function fileToPages(file){
  if(file.type==='application/pdf'||file.name?.toLowerCase().endsWith('.pdf')){
    const bytes=new Uint8Array(await file.arrayBuffer());
    const doc=await pdfjsLib.getDocument({data:bytes}).promise; const out=[];
    for(let p=1;p<=doc.numPages;p++){
      const pg=await doc.getPage(p), vp=pg.getViewport({scale:3}); const c=document.createElement('canvas'); c.width=vp.width;c.height=vp.height;
      await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
      out.push({id:crypto.randomUUID(),name:`${file.name} — pág. ${p}`,dataUrl:c.toDataURL('image/jpeg',.95),rotation:0,enhanced:false});
    } return out;
  }
  return [{id:crypto.randomUUID(),name:file.name||'Fotografia',dataUrl:await dataUrlFromBlob(file),rotation:0,enhanced:false}];
}

async function drawActive(){
  const p=scan.pages[scan.active], c=document.querySelector('#scanCanvas'); if(!p||!c){return;}
  const img=await imageFromUrl(p.dataUrl); const rot=((p.rotation%360)+360)%360; const swap=rot===90||rot===270;
  c.width=swap?img.naturalHeight:img.naturalWidth;c.height=swap?img.naturalWidth:img.naturalHeight;
  const x=c.getContext('2d');x.save();x.translate(c.width/2,c.height/2);x.rotate(rot*Math.PI/180);x.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);x.restore();
  renderThumbs();
}
function renderThumbs(){
  const n=document.querySelector('#scanThumbs'); if(!n)return;n.innerHTML=scan.pages.map((p,i)=>`<button class="scan-thumb ${i===scan.active?'active':''}" data-i="${i}"><img src="${p.dataUrl}"><span>${i+1}</span></button>`).join('');
  n.querySelectorAll('.scan-thumb').forEach(b=>b.onclick=()=>{scan.active=Number(b.dataset.i);drawActive();});
}
async function addFiles(files){
  setStatus('A importar páginas…');
  for(const f of files) scan.pages.push(...await fileToPages(f));
  if(scan.pages.length){scan.active=scan.pages.length-1;await drawActive();setStatus(`${scan.pages.length} página(s) pronta(s). Escolhe “Melhorar” e depois OCR.`);}
}

function otsu(data){
  const hist=new Uint32Array(256);for(let i=0;i<data.length;i+=4){const y=(.299*data[i]+.587*data[i+1]+.114*data[i+2])|0;hist[y]++;}
  const total=data.length/4;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let sB=0,wB=0,max=0,t=127;
  for(let i=0;i<256;i++){wB+=hist[i];if(!wB)continue;const wF=total-wB;if(!wF)break;sB+=i*hist[i];const mB=sB/wB,mF=(sum-sB)/wF,v=wB*wF*(mB-mF)**2;if(v>max){max=v;t=i;}}return t;
}
function applyPreset(c,preset){
  const x=c.getContext('2d'),im=x.getImageData(0,0,c.width,c.height),d=im.data;
  if(preset==='photo'){
    for(let i=0;i<d.length;i+=4) for(let k=0;k<3;k++) d[i+k]=Math.max(0,Math.min(255,(d[i+k]-128)*1.12+136));
  } else if(preset==='handwriting'){
    // Manuscrito: NÃO binarizar. Lápis/esferográfica clara desaparecem com threshold agressivo.
    // Mantém tons finos, converte para cinzento e aumenta contraste moderadamente.
    for(let i=0;i<d.length;i+=4){
      let y=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      y=(y-128)*1.28+142;
      // clareia fundo sem apagar traços leves
      if(y>215) y=215+(y-215)*0.65;
      d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,y));
    }
  } else {
    const t=otsu(d);
    for(let i=0;i<d.length;i+=4){let y=.299*d[i]+.587*d[i+1]+.114*d[i+2];y=(y-128)*1.3+140;y=y<t?18:250;d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,y));}
  }
  x.putImageData(im,0,0);
}
function autoCropCanvas(c){
  const x=c.getContext('2d'),im=x.getImageData(0,0,c.width,c.height),d=im.data;let minX=c.width,minY=c.height,maxX=0,maxY=0,hit=0;
  const step=Math.max(2,Math.floor(Math.min(c.width,c.height)/800));
  for(let y=0;y<c.height;y+=step)for(let xx=0;xx<c.width;xx+=step){const i=(y*c.width+xx)*4,lum=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(lum<225){minX=Math.min(minX,xx);minY=Math.min(minY,y);maxX=Math.max(maxX,xx);maxY=Math.max(maxY,y);hit++;}}
  if(hit<100)return false;const mx=(maxX-minX)*.035,my=(maxY-minY)*.035;minX=Math.max(0,minX-mx);minY=Math.max(0,minY-my);maxX=Math.min(c.width,maxX+mx);maxY=Math.min(c.height,maxY+my);
  if((maxX-minX)*(maxY-minY)<c.width*c.height*.25)return false;const tmp=document.createElement('canvas');tmp.width=maxX-minX;tmp.height=maxY-minY;tmp.getContext('2d').drawImage(c,minX,minY,tmp.width,tmp.height,0,0,tmp.width,tmp.height);c.width=tmp.width;c.height=tmp.height;c.getContext('2d').drawImage(tmp,0,0);return true;
}
async function commitCanvas(){const c=document.querySelector('#scanCanvas'),p=scan.pages[scan.active];if(!p)return;p.dataUrl=c.toDataURL('image/jpeg',.96);p.rotation=0;p.enhanced=true;renderThumbs();}

async function runLocalOcr(){
  if(!scan.pages.length)return; if(scan.busy)return;scan.busy=true;const btn=document.querySelector('#scanOcr');btn.disabled=true;
  try{
    if(!scan.worker){setStatus('A iniciar OCR português… na primeira utilização pode descarregar o modelo linguístico.');scan.worker=await createWorker('por');}
    let all='',weighted=0,count=0;
    for(let i=0;i<scan.pages.length;i++){
      scan.active=i;await drawActive();setStatus(`OCR local: página ${i+1}/${scan.pages.length}…`);
      const c=document.querySelector('#scanCanvas');const r=await scan.worker.recognize(c);all+=(i?`\n\n--- PÁGINA ${i+1} ---\n`:'')+(r.data.text||'');weighted+=(r.data.confidence||0);count++;
    }
    scan.resultText=all.trim();scan.confidence=count?weighted/count:null;document.querySelector('#scanText').value=scan.resultText;document.querySelector('#scanConfidence').textContent=scan.confidence!=null?`Confiança média ${scan.confidence.toFixed(0)}%`:'';await extractAndShow();setStatus('OCR concluído. Revê o texto antes de preencher a ficha.');
  }catch(err){console.error(err);setStatus('Falha no OCR local: '+err.message);alert('OCR local falhou. Para manuscritos difíceis, configura OCR Pro.');}
  finally{scan.busy=false;btn.disabled=false;}
}
async function canvasVariantDataUrls(){
  const c=document.querySelector('#scanCanvas');
  const original=c.toDataURL('image/jpeg',.97);
  const tmp=document.createElement('canvas'); tmp.width=c.width; tmp.height=c.height;
  tmp.getContext('2d').drawImage(c,0,0);
  applyPreset(tmp,'handwriting');
  const enhanced=tmp.toDataURL('image/jpeg',.97);
  return [original, enhanced];
}

async function callProEndpoint(endpoint,token,dataUrl){
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token,imageBase64:dataUrl.split(',')[1],mimeType:'image/jpeg',languageHints:['pt','pt-PT'],mode:'handwriting'})});
  const data=await response.json().catch(()=>({error:`Resposta inválida (HTTP ${response.status})`}));
  if(!response.ok && !data.error) throw new Error(`HTTP ${response.status}`);
  if(data.error) throw new Error(typeof data.error==='string'?data.error:JSON.stringify(data.error));
  return data;
}

function scoreOcrText(text=''){
  const t=text.trim(); if(!t) return 0;
  const letters=(t.match(/[A-Za-zÀ-ÿ0-9]/g)||[]).length;
  const bad=(t.match(/[|{}<>~^`]/g)||[]).length;
  const words=(t.match(/\b[\p{L}\d]{2,}\b/gu)||[]).length;
  return letters + words*3 - bad*2;
}

async function runProOcr(){
  if(!scan.pages.length)return;
  const {endpoint,token}=getOcrSettings();
  if(!endpoint){openSettings();return;}
  try{
    scan.busy=true;document.querySelector('#scanOcrPro').disabled=true;
    let all=''; scan.proPages=[];
    for(let i=0;i<scan.pages.length;i++){
      scan.active=i;await drawActive();setStatus(`OCR manuscrito Pro: página ${i+1}/${scan.pages.length} — análise multipass…`);
      const variants=await canvasVariantDataUrls();
      const results=[];
      for(const dataUrl of variants){
        try{results.push(await callProEndpoint(endpoint,token,dataUrl));}catch(e){console.warn('OCR variant falhou',e);}
      }
      if(!results.length) throw new Error('O serviço OCR Pro não devolveu resultado.');
      results.sort((a,b)=>scoreOcrText(b.text)-scoreOcrText(a.text));
      const best=results[0];
      scan.proPages.push({pageIndex:i,text:best.text||'',annotation:best.fullTextAnnotation||null});
      all+=(i?`\n\n--- PÁGINA ${i+1} ---\n`:'')+(best.text||'');
    }
    scan.resultText=all.trim();document.querySelector('#scanText').value=scan.resultText;
    document.querySelector('#scanConfidence').textContent='OCR Manuscrito Pro';
    await extractAndShow();setStatus('OCR manuscrito concluído. Revê os campos assinalados antes de preencher a ficha.');
  }catch(err){console.error(err);alert('OCR Manuscrito Pro: '+err.message);setStatus('Falha no OCR Manuscrito Pro. Verifica endpoint/token e qualidade do scan.');}
  finally{scan.busy=false;document.querySelector('#scanOcrPro').disabled=false;}
}

function wordsFromAnnotation(annotation){
  if(!annotation?.pages?.length)return [];
  const pg=annotation.pages[0], width=pg.width||1, height=pg.height||1, out=[];
  for(const block of pg.blocks||[])for(const para of block.paragraphs||[])for(const word of para.words||[]){
    const text=(word.symbols||[]).map(s=>s.text||'').join('').trim(); if(!text)continue;
    const vs=word.boundingBox?.vertices||[]; const xs=vs.map(v=>Number(v.x||0)), ys=vs.map(v=>Number(v.y||0)); if(!xs.length)continue;
    out.push({text,x1:Math.min(...xs)/width,x2:Math.max(...xs)/width,y1:Math.min(...ys)/height,y2:Math.max(...ys)/height});
  }
  return out;
}
function fieldNormRect(rect,padX=.004,padY=.003){
  const [x1,y1,x2,y2]=rect;
  return {x1:Math.max(0,x1/PDF_W-padX),x2:Math.min(1,x2/PDF_W+padX),y1:Math.max(0,1-y2/PDF_H-padY),y2:Math.min(1,1-y1/PDF_H+padY)};
}
function textForRect(words,rect){
  const r=fieldNormRect(rect);
  const hit=words.filter(w=>{const cx=(w.x1+w.x2)/2,cy=(w.y1+w.y2)/2;return cx>=r.x1&&cx<=r.x2&&cy>=r.y1&&cy<=r.y2;});
  hit.sort((a,b)=>Math.abs(((a.y1+a.y2)-(b.y1+b.y2))/2)<.008?a.x1-b.x1:a.y1-b.y1);
  return compact(hit.map(w=>w.text).join(' '));
}
async function pageCanvasForScan(index){
  const p=scan.pages[index]; if(!p)return null; const img=await imageFromUrl(p.dataUrl); const rot=((p.rotation||0)%360+360)%360, swap=rot===90||rot===270;
  const c=document.createElement('canvas'); c.width=swap?img.naturalHeight:img.naturalWidth;c.height=swap?img.naturalWidth:img.naturalHeight;
  const x=c.getContext('2d');x.save();x.translate(c.width/2,c.height/2);x.rotate(rot*Math.PI/180);x.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);x.restore();return c;
}
async function checkboxMarked(field){
  const c=await pageCanvasForScan(field.page); if(!c)return false; const [x1,y1,x2,y2]=field.rect;
  const nx1=x1/PDF_W,nx2=x2/PDF_W,ny1=1-y2/PDF_H,ny2=1-y1/PDF_H;
  const px1=Math.max(0,Math.floor(nx1*c.width)),px2=Math.min(c.width,Math.ceil(nx2*c.width)),py1=Math.max(0,Math.floor(ny1*c.height)),py2=Math.min(c.height,Math.ceil(ny2*c.height));
  const w=px2-px1,h=py2-py1;if(w<4||h<4)return false; const mx=Math.max(2,Math.floor(w*.28)),my=Math.max(2,Math.floor(h*.28));
  const sx=px1+mx,sy=py1+my,sw=Math.max(1,w-2*mx),sh=Math.max(1,h-2*my);const d=c.getContext('2d').getImageData(sx,sy,sw,sh).data;
  let dark=0,total=0;for(let i=0;i<d.length;i+=4){const lum=.299*d[i]+.587*d[i+1]+.114*d[i+2];if(lum<195)dark++;total++;}
  return total>0 && dark/total>.075;
}
async function extractSpatialTargetFields(){
  const out={}; const byPage=new Map(scan.proPages.map(p=>[p.pageIndex,p]));
  for(const field of TEMPLATE_FIELDS){
    if(field.type==='text'){
      const pr=byPage.get(field.page); if(!pr?.annotation)continue; const words=pr._words||(pr._words=wordsFromAnnotation(pr.annotation)); const v=textForRect(words,field.rect); if(v)out[field.name]=v;
    }
  }
  // Detecta checkboxes pelo próprio scan; só acrescenta os que parecem marcados.
  const checks=TEMPLATE_FIELDS.filter(f=>f.type==='checkbox'&&f.page<scan.pages.length);
  for(const field of checks){try{if(await checkboxMarked(field))out[field.name]=true;}catch(e){console.warn('checkbox',field.name,e);}}
  return out;
}
function logicalToTargets(logical){const out={};for(const [k,v] of Object.entries(logical)){const target=FIELD_MAP[k];if(target)out[target]=v;}return out;}

function normText(text=''){
  return String(text)
    .replace(/\r/g,'')
    .replace(/[\u00A0\t]+/g,' ')
    .replace(/[ ]{2,}/g,' ')
    .replace(/\n[ ]+/g,'\n')
    .trim();
}
function compact(v=''){
  return String(v).replace(/[_]{2,}/g,' ').replace(/\s{2,}/g,' ').replace(/^[:;,.\-\s]+|[:;,.\-\s]+$/g,'').trim();
}
function labelValue(text,label,nextLabels=[]){
  const src=normText(text);
  const esc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const labelRe=typeof label==='string'?esc(label):label.source;
  const next=nextLabels.map(x=>typeof x==='string'?esc(x):x.source).join('|');
  const re=new RegExp(`(?:^|\\n|\\s)${labelRe}\\s*[:;.,-]?\\s*([\\s\\S]{0,220}?)(?=${next?`(?:\\n|\\s)(?:${next})\\s*[:;.,-]?`:'$'})`,'i');
  const m=src.match(re);
  return compact(m?.[1]||'').replace(/\n+/g,' ');
}
function firstDate(text,afterLabel=''){
  const src=afterLabel?labelValue(text,afterLabel,['1. Identificação','Já requereu RSI','N.º Processo Familiar']):normText(text);
  const m=(src||text).match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if(!m)return null;
  let y=m[3]; if(y.length===2)y=(Number(y)>40?'19':'20')+y;
  return {dia:m[1].padStart(2,'0'),mes:m[2].padStart(2,'0'),ano:y,raw:`${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${y}`};
}
function hasCheckedNear(text,label,window=50){
  const src=normText(text); const i=src.toLowerCase().indexOf(label.toLowerCase()); if(i<0)return false;
  const part=src.slice(i,i+window);
  return /[☑☒✓✔Xx]/.test(part.replace(/\bNão\b/gi,''));
}
function onlyDigits(v=''){return String(v).replace(/\D/g,'');}
function cleanNumber(v=''){return String(v).replace(/(?<=\d)\s+(?=\d)/g,'').replace(/[^0-9A-Za-z./-]/g,' ').replace(/\s+/g,' ').trim();}
function parseAggregate(text){
  const src=normText(text);
  const i=src.search(/2\.\s*Agregado\s+Familiar/i); if(i<0)return {};
  let block=src.slice(i); const j=block.search(/Observa(?:ç|c)[õo]es\s*\(/i); if(j>0)block=block.slice(0,j);
  const lines=block.split('\n').map(compact).filter(Boolean);
  const dataIdx=lines.findIndex(l=>/Data\s+Nas/i.test(l));
  const candidates=lines.slice(Math.max(0,dataIdx+1)).filter(l=>/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(l));
  if(!candidates.length)return {};
  const row=candidates[0];
  const dm=row.match(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/); if(!dm)return {};
  const date=dm[1], pos=row.indexOf(date); let left=compact(row.slice(0,pos)), right=compact(row.slice(pos+date.length));
  const estados=['Casado','Casada','Solteiro','Solteira','Divorciado','Divorciada','Viúvo','Viúva','Unido','Unida'];
  const parentescos=['Marido','Esposa','Filho','Filha','Pai','Mãe','Mae','Irmão','Irmã','Irmao','Irma','Companheiro','Companheira','Neto','Neta','Avô','Avó','Avo'];
  let estado=''; for(const x of estados){const r=new RegExp(`\\b${x}\\b`,'i'); if(r.test(left)){estado=x;left=compact(left.replace(r,''));break;}}
  let parentesco=''; for(const x of parentescos){const r=new RegExp(`\\b${x}\\b`,'i'); if(r.test(left)){parentesco=x;left=compact(left.replace(r,''));break;}}
  let niss=''; const nm=right.match(/(?:\b\d[\d ]{7,14}\b)\s*$/); if(nm){niss=onlyDigits(nm[0]);right=compact(right.slice(0,right.lastIndexOf(nm[0])));}
  return {agregado1Nome:left,agregado1Parentesco:parentesco,agregado1EstadoCivil:estado,agregado1DataNascimento:date,agregado1Profissao:right,agregado1Niss:niss};
}
function parseObservacoesAgregado(text){
  const src=normText(text);
  const m=src.match(/Observa(?:ç|c)[õo]es\s*\(pedidos\/problemas,?\s*encaminhamentos,?\s*elemento\s*alvo\)\s*:?\s*([\s\S]*?)(?=---\s*PÁGINA\s*2|3\.1\.?\s*Saúde|$)/i);
  if(!m)return '';
  return compact(m[1].replace(/\n+/g,' '));
}
function extractFields(text){
  const clean=normText(text), out={};
  const topDate=firstDate(clean); if(topDate){out.dataFichaDia=topDate.dia;out.dataFichaMes=topDate.mes;out.dataFichaAno=topDate.ano;}
  out.jaRequereuRsi=hasCheckedNear(clean,'Já requereu RSI',35);
  const rsiSeg=labelValue(clean,/Já\s+requereu\s+RSI/i,[/N\.?º?\s*Processo\s+Familiar/i,'Titular','Requerente']); const rsiDate=firstDate(rsiSeg); if(rsiDate){out.dataRsiDia=rsiDate.dia;out.dataRsiMes=rsiDate.mes;out.dataRsiAno=rsiDate.ano;}
  out.processoFamiliar=cleanNumber(labelValue(clean,/N\.?º?\s*Processo\s+Familiar/i,['Outro, qual','Iniciativa','Nome']));
  out.titular=hasCheckedNear(clean,'Titular',25); out.requerente=hasCheckedNear(clean,'Requerente',30);
  out.iniciativaPropria=hasCheckedNear(clean,'Iniciativa: Própria',45);
  out.iniciativaOutro=hasCheckedNear(clean,'Outro, qual',40);
  out.outroQual=labelValue(clean,'Outro, qual',['Iniciativa: Própria','Nome','Data de Nascimento']);
  out.nome=labelValue(clean,'Nome',['Data de Nascimento','Naturalidade']);
  out.dataNascimento=labelValue(clean,/Data\s+de\s+Nascimento/i,['Naturalidade','B.I','B. I','C.C']);
  out.naturalidade=labelValue(clean,'Naturalidade',['B.I','B. I','C.C','Estado Civil','Nacionalidade']);
  out.biCc=cleanNumber(labelValue(clean,/B\.?I\.?\s*\/\s*C\.?C\.?/i,['Emitido','Validade','Arquivo','Estado Civil']));
  const val=labelValue(clean,/Emitido\s*\/\s*Validade|Emitido\s+Validade|Validade/i,['Arquivo de','Arquivo','Estado Civil','Nacionalidade']); const vd=firstDate(val); if(vd){out.validadeDia=vd.dia;out.validadeMes=vd.mes;out.validadeAno=vd.ano;}
  out.arquivo=labelValue(clean,/Arquivo\s+de/i,['Estado Civil','Nacionalidade','Beneficiário']);
  out.estadoCivil=labelValue(clean,'Estado Civil',['Nacionalidade','Beneficiário','Contribuinte']);
  out.nacionalidade=labelValue(clean,'Nacionalidade',['Beneficiário','Contribuinte','Morada']);
  out.beneficiario=cleanNumber(labelValue(clean,/Benefici[aá]rio\s+n\.?º?/i,['Contribuinte','Morada','Código Postal']));
  out.contribuinte=cleanNumber(labelValue(clean,/Contribuinte\s+n\.?º?/i,['Morada','Código Postal','Contactos','Agregado Familiar']));
  out.morada=labelValue(clean,'Morada',['Código Postal','Contactos','Agregado Familiar']);
  const cp=clean.match(/(?:Código\s*Postal|C[oó]d\.?\s*Postal)\s*[:\-]?\s*(\d{4})\s*[- ]\s*(\d{3})(?:\s+([^\n]{2,60}))?/i);if(cp){out.codigoPostal1=cp[1];out.codigoPostal2=cp[2];if(cp[3]&&!/Contactos|Agregado/i.test(cp[3]))out.localidade=compact(cp[3]);}
  out.contactos=cleanNumber(labelValue(clean,'Contactos',['2. Agregado Familiar','Agregado Familiar','Observações']));
  Object.assign(out,parseAggregate(clean));
  out.observacoesAgregado=parseObservacoesAgregado(clean);
  // Remove vazios, mas preserva booleanos false/true para checkboxes encontrados.
  return Object.fromEntries(Object.entries(out).filter(([,v])=>typeof v==='boolean' || (v!==undefined&&v!==null&&String(v).trim()!=='')));
}

function prettyKey(k){
  const logical=({dataFichaDia:'Data — dia',dataFichaMes:'Data — mês',dataFichaAno:'Data — ano',jaRequereuRsi:'Já requereu RSI',dataRsiDia:'RSI — dia',dataRsiMes:'RSI — mês',dataRsiAno:'RSI — ano',processoFamiliar:'N.º Processo Familiar',titular:'Titular',requerente:'Requerente',iniciativaPropria:'Iniciativa própria',iniciativaOutro:'Outro',outroQual:'Outro — qual',nome:'Nome',dataNascimento:'Data de Nascimento',naturalidade:'Naturalidade',biCc:'BI / CC',validadeDia:'Validade — dia',validadeMes:'Validade — mês',validadeAno:'Validade — ano',arquivo:'Arquivo de',estadoCivil:'Estado Civil',nacionalidade:'Nacionalidade',beneficiario:'Beneficiário n.º',contribuinte:'Contribuinte n.º',morada:'Morada',codigoPostal1:'Código Postal',codigoPostal2:'Código Postal — extensão',localidade:'Localidade',contactos:'Contactos',agregado1Nome:'Agregado 1 — Nome',agregado1Parentesco:'Agregado 1 — Parentesco',agregado1EstadoCivil:'Agregado 1 — Est. civil',agregado1DataNascimento:'Agregado 1 — Data Nas.',agregado1Profissao:'Agregado 1 — Profissão/Ensino',agregado1Niss:'Agregado 1 — NISS',observacoesAgregado:'Observações do agregado'})[k];
  return logical||directFieldLabel(k);
}
// Opções Sim/Não são mutuamente exclusivas. Se o OCR espacial marcar ambas,
// conserva a decisão textual quando existir; caso contrário evita preencher as duas.
function normalizeExclusiveChecks(fields){
  const pairs=[
    ['P2_check_025','P2_check_026'], // Saúde
    ['P2_check_027','P2_check_028'], // Isento
    ['P2_check_040','P2_check_049'], // Atividade profissional
    ['P2_check_051','P2_check_052'], // Centro de emprego
    ['P2_check_057','P2_check_059'], // Carta condução
    ['P2_check_060','P2_check_061'], // Carro próprio
    ['P2_check_068','P2_check_069'], // Frequenta ensino
    ['P3_check_088','P3_check_089'], // Rendimentos
    ['P3_check_090','P3_check_091'], // Despesas
    ['P4_check_096','P4_check_097'], // Habitação
    ['P4_check_098','P4_check_099'], // Própria
    ['P4_check_100','P4_check_101']  // Habitação social
  ];
  for(const [yes,no] of pairs){
    if(fields[yes]===true && fields[no]===true){
      // Ambiguidade: não inventar uma resposta. Deixa ambas por marcar para revisão.
      fields[yes]=false; fields[no]=false;
    }
  }
  return fields;
}

async function extractAndShow(){
  scan.resultText=document.querySelector('#scanText').value;
  const spatial=await extractSpatialTargetFields();
  const logicalTargets=logicalToTargets(extractFields(scan.resultText));
  // Regras por rótulo prevalecem onde são mais seguras; uma marca espacial verdadeira nunca é apagada por um falso negativo do OCR textual.
  const f={...spatial}; for(const [k,v] of Object.entries(logicalTargets)){if(v===false&&f[k]===true)continue;f[k]=v;} normalizeExclusiveChecks(f);
  const n=document.querySelector('#scanExtracted'); n.dataset.fields=JSON.stringify(f);
  const entries=Object.entries(f).filter(([,v])=>typeof v==='boolean'||String(v??'').trim()!=='');
  const pages=new Set(entries.map(([k])=>TEMPLATE_FIELDS.find(x=>x.name===k)?.page).filter(x=>x!=null));
  n.innerHTML=entries.length?`<h4>Campos sugeridos — ${entries.length} em ${pages.size||1} página(s)</h4>${entries.map(([k,v])=>typeof v==='boolean'?`<label><span>${e(prettyKey(k))}</span><input data-key="${e(k)}" type="checkbox" ${v?'checked':''}></label>`:`<label><span>${e(prettyKey(k))}</span><input data-key="${e(k)}" value="${e(v)}"></label>`).join('')}`:'<p>Não encontrei campos com confiança suficiente. Revê o texto, melhora o scan e tenta novamente.</p>';
  n.querySelectorAll('input').forEach(i=>i.oninput=()=>{const obj=JSON.parse(n.dataset.fields||'{}');obj[i.dataset.key]=i.type==='checkbox'?i.checked:i.value;n.dataset.fields=JSON.stringify(obj);});
  return f;
}
async function fillForm(api){
  const n=document.querySelector('#scanExtracted');let f=JSON.parse(n.dataset.fields||'{}');if(!Object.keys(f).length){f=await extractAndShow();if(!Object.keys(f).length)return;}
  let applied=0; const pages=new Set();
  for(const [k,v] of Object.entries(f)){
    const target=FIELD_MAP[k]||k; if(!TEMPLATE_FIELD_SET.has(target)&&target!=='P1_observacoes_agregado')continue;
    api.editor.formValues[target]=v; applied++; const meta=TEMPLATE_FIELDS.find(x=>x.name===target);if(meta)pages.add(meta.page+1);
  }
  api.markDirty();api.renderAll();
  api.status(`${applied} campo(s) do OCR aplicados em ${pages.size||1} página(s) da ficha. Confirma visualmente todas as páginas antes de guardar.`);
  document.querySelector('#scannerModal').hidden=true;
  window.scrollTo({top:0,behavior:'smooth'});
}

let sharedOcrConfig={endpoint:'',token:''};
async function loadSharedOcrConfig(){
  try{const r=await fetch(`${import.meta.env.BASE_URL}ocr-config.json`,{cache:'no-store'});if(r.ok){const j=await r.json();sharedOcrConfig={endpoint:String(j.endpoint||'').trim(),token:String(j.token||'')};}}catch(e){console.info('OCR config local não definido');}
}
function getOcrSettings(){return {endpoint:(localStorage.getItem('rjp.ocr.endpoint')||sharedOcrConfig.endpoint||'').trim(),token:localStorage.getItem('rjp.ocr.token')||sharedOcrConfig.token||''};}

function openSettings(){const d=document.querySelector('#ocrSettingsDialog');const cfg=getOcrSettings();document.querySelector('#ocrEndpoint').value=cfg.endpoint;document.querySelector('#ocrToken').value=cfg.token;d.showModal();}

export function initScanner(api){
  modal();const m=document.querySelector('#scannerModal');
  document.querySelector('#scanBtn').onclick=()=>{m.hidden=false;setTimeout(()=>drawActive(),0);};
  document.querySelector('#scanClose').onclick=()=>m.hidden=true;
  document.querySelector('#scanCamera').onchange=e=>addFiles([...e.target.files]);
  document.querySelector('#scanFiles').onchange=e=>addFiles([...e.target.files]);
  document.querySelector('#scanFolder').onchange=e=>addFiles([...e.target.files].filter(f=>f.type.startsWith('image/')||f.type==='application/pdf'||/\.pdf$/i.test(f.name)));
  const drop=document.querySelector('#scanStatus');
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag');}));
  drop.addEventListener('drop',e=>{const fs=[...e.dataTransfer.files].filter(f=>f.type.startsWith('image/')||f.type==='application/pdf'||/\.pdf$/i.test(f.name)); if(fs.length)addFiles(fs);});
  document.querySelector('#scanRotate').onclick=async()=>{if(!scan.pages.length)return;scan.pages[scan.active].rotation=(scan.pages[scan.active].rotation+90)%360;await drawActive();};
  document.querySelector('#scanAutoCrop').onclick=async()=>{const ok=autoCropCanvas(document.querySelector('#scanCanvas'));if(ok){await commitCanvas();setStatus('Recorte automático aplicado.');}else setStatus('Não consegui detetar margens com segurança; mantive a página inteira.');};
  document.querySelector('#scanPreset').onchange=e=>scan.preset=e.target.value;
  document.querySelector('#scanEnhance').onclick=async()=>{if(!scan.pages.length)return;applyPreset(document.querySelector('#scanCanvas'),scan.preset);await commitCanvas();setStatus(`Melhoria “${scan.preset}” aplicada.`);};
  loadSharedOcrConfig();document.querySelector('#scanOcr').onclick=runLocalOcr;document.querySelector('#scanOcrPro').onclick=async()=>{const {endpoint}=getOcrSettings();if(endpoint){await runProOcr();}else{openSettings();}};document.querySelector('#scanSettings').onclick=openSettings;
  document.querySelector('#scanExtract').onclick=()=>extractAndShow();document.querySelector('#scanFill').onclick=()=>fillForm(api);document.querySelector('#scanCopy').onclick=()=>navigator.clipboard?.writeText(document.querySelector('#scanText').value);
  document.querySelector('#scanText').oninput=e=>{scan.resultText=e.target.value;};
  document.querySelector('#ocrSaveSettings').onclick=()=>{localStorage.setItem('rjp.ocr.endpoint',document.querySelector('#ocrEndpoint').value.trim());localStorage.setItem('rjp.ocr.token',document.querySelector('#ocrToken').value);};
}
