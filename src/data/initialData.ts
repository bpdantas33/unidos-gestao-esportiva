import { Player, Match, Transaction, UnpaidMember, TeamStandings, PlayerPosition, SquadCategory } from '../types';

export const UNIDOS_LOGO = '/escudo-unidos.png';
export const TITANS_LOGO = '';
export const MNT_LOGO = '';
export const CTY_LOGO = '';
export const EGL_LOGO = '';
export const IBERIA_LOGO = '';
export const TITAN_FC_LOGO = '';
export const MAP_IMAGE = '';
export const PROFILES = {};

const DEFAULT_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBF1LVhWUZnFla0LwkJo6umZHn7LA36eRpaoHz9UHXs9jiqP6p-jASZsi1BzPLo3wR5YPfoFwaZEw3N0QaYudZPxBZratlgK9sfdZgEtsLLysmNYHcjJrr8Rle1GoiIUfVRHgsZXcI0MnlBXnqtRCEurM5HpHOHv04lXddjXZBnfLY8-Vl9diIK24pRUP2syNZS6Oh3NqIiCBut-MG2La-hca-z7XZFn-smSuPHo8EIgv5BGZG76VQ6sJkur7FuhoYh3X48lL1I34GW';

function p(name: string, num: number, position: PlayerPosition, age: number, squad: SquadCategory, phone = ''): Player {
  return {
    id: String(num),
    name,
    number: num,
    position,
    country: '',
    age,
    rating: 75,
    condition: 100,
    isInjured: false,
    games: 0,
    goals: position === 'Atacante' || position === 'Meio-Campo' ? 0 : undefined,
    tackles: position === 'Defensor' ? 0 : undefined,
    cleanSheets: position === 'Goleiro' ? 0 : undefined,
    image: DEFAULT_IMAGE,
    squad,
    phone,
  };
}

export const initialPlayers: Player[] = [
  // Master
  p('Adilson dos Santos Sampaio', 1, 'Meio-Campo', 49, 'Master'),
  p('Ailton da Silva Purificação (Puri)', 2, 'Meio-Campo', 53, 'Master'),
  p('Antonio César Borin', 4, 'Defensor', 59, 'Master'),
  p('Bruno Pessoa Dantas', 6, 'Atacante', 46, 'Master'),
  p('Eraldo Samuel Dasilva', 11, 'Goleiro', 37, 'Master'),
  p('Fabio Luiz Motta (Pinguim)', 14, 'Atacante', 44, 'Master'),
  p('Fabricio Ciconi Tsutsui', 15, 'Meio-Campo', 47, 'Master'),
  p('Gledson Brito (Guegué)', 17, 'Atacante', 48, 'Master'),
  p('Herminio Alves de Araujo Neto', 18, 'Meio-Campo', 45, 'Master'),
  p('Hernandes de Oliuveira dos Santos (Nando)', 19, 'Defensor', 48, 'Master'),
  p('Humberto Fontana Neto (Alemão)', 20, 'Defensor', 41, 'Master'),
  p('José Ernandes Jesus Silva (Russo)', 24, 'Defensor', 57, 'Master'),
  p('Kleber Matias de Souza', 26, 'Defensor', 44, 'Master'),
  p('Leandro Xavier dos Santos', 28, 'Atacante', 42, 'Master'),
  p('Lucas Franco Gomes de Amorim', 30, 'Meio-Campo', 33, 'Master'),
  p('Luiz Batista Esteves (Luizinho)', 31, 'Defensor', 49, 'Master'),
  p('Marcelo Nunes Comenda Belchior', 33, 'Meio-Campo', 45, 'Master'),
  p('Marcio Adriano da Silva (Argentino)', 34, 'Defensor', 54, 'Master'),
  p('Marcos Ferreira Neves', 35, 'Goleiro', 47, 'Master'),
  p('Odilon Roberto Leite da Silva', 39, 'Meio-Campo', 57, 'Master'),
  p('Rafael Borges Santos', 41, 'Defensor', 45, 'Master'),
  p('Ramon Pessoa Dantas', 43, 'Meio-Campo', 43, 'Master'),
  p('Renato Godoi Moreira', 44, 'Meio-Campo', 52, 'Master'),
  p('Renato Machado Ferraris', 45, 'Meio-Campo', 41, 'Master'),
  p('Ricardo Simao da Silva', 46, 'Atacante', 42, 'Master'),
  p('Ricardo Yoshiyuki Okawada', 47, 'Defensor', 43, 'Master'),
  p('Rogério Miranda Cavalcanti', 48, 'Meio-Campo', 49, 'Master'),
  p('Sandro Luiz Hamaue', 50, 'Atacante', 45, 'Master'),

  // Veterano/Esporte
  p('Andrey Vinicius Damasceno', 3, 'Atacante', 34, 'Veterano/Esporte'),
  p('Arthur de Souza Rebolo', 5, 'Meio-Campo', 37, 'Veterano/Esporte'),
  p('César Henrique (Rato)', 7, 'Meio-Campo', 28, 'Veterano/Esporte'),
  p('Daniel Lessa do Rosario', 8, 'Meio-Campo', 33, 'Veterano/Esporte'),
  p('Eduardo Tadashi Shiga', 9, 'Meio-Campo', 36, 'Veterano/Esporte'),
  p('Elliakin de Matos Silva', 10, 'Meio-Campo', 37, 'Veterano/Esporte'),
  p('Erick Yamamoto Dantas', 12, 'Defensor', 28, 'Veterano/Esporte'),
  p('Ewerton Benjamin Santos Barbosa', 13, 'Atacante', 35, 'Veterano/Esporte'),
  p('Felipe Rodrigues da Silva Alvarenga (Mancha)', 16, 'Defensor', 31, 'Veterano/Esporte'),
  p('Jean Carlos Godoy', 21, 'Meio-Campo', 28, 'Veterano/Esporte'),
  p('Joao Batista Gouveia Junior', 22, 'Meio-Campo', 29, 'Veterano/Esporte'),
  p('Jonathan do Nascimento Silva (Hulk)', 23, 'Atacante', 36, 'Veterano/Esporte'),
  p('José Roberto Ramos da Silva Junior', 25, 'Atacante', 30, 'Veterano/Esporte'),
  p('Lauro da Silva Gonzaga Junior (Junho)', 27, 'Atacante', 38, 'Veterano/Esporte'),
  p('Lucas Aparecido Pedroso', 29, 'Meio-Campo', 41, 'Veterano/Esporte'),
  p('Luiz Carlos de Camargo Junior', 32, 'Atacante', 31, 'Veterano/Esporte'),
  p('Marinho Puerta Junior', 36, 'Atacante', 38, 'Veterano/Esporte'),
  p('Matheus Ferreira de Araujo', 37, 'Defensor', 18, 'Veterano/Esporte'),
  p('Mateus Macena da Silva', 38, 'Defensor', 28, 'Veterano/Esporte'),
  p('Paulo Henrique Aquino de Goes', 40, 'Atacante', 37, 'Veterano/Esporte'),
  p('Rafael Gomes Igari', 42, 'Defensor', 39, 'Veterano/Esporte'),
  p('Roni Simao da Silva', 49, 'Meio-Campo', 39, 'Veterano/Esporte'),
  p('Washington Dias da Silva', 51, 'Atacante', 40, 'Veterano/Esporte'),
];

function m(id: string, date: string, time: string, opponent: string, stadium: string, team: 'Master' | 'Veterano/Esporte' | 'Ambos', homeScore?: number | null, awayScore?: number | null): Match[] {
  const hs = homeScore ?? undefined;
  const as = awayScore ?? undefined;
  const status = hs !== undefined && as !== undefined
    ? (hs > as ? 'VITÓRIA' : hs === as ? 'EMPATE' : 'DERROTA')
    : 'CONFIRMADO';

  const base: Omit<Match, 'squad'> = {
    id, date, type: 'AMISTOSO',
    homeTeam: 'Unidos Suzano', homeLogo: UNIDOS_LOGO,
    awayTeam: opponent, awayLogo: '',
    homeScore: hs, awayScore: as,
    isConfirmed: true, status, time, stadium,
    confirmedPlayers: [],
  };

  if (team === 'Ambos') {
    return [
      { ...base, id: id + 'a', squad: 'Master' },
      { ...base, id: id + 'b', squad: 'Veterano/Esporte' },
    ];
  }
  return [{ ...base, squad: team }];
}

export const initialMatches: Match[] = [
  ...m('1', '03/01/2026', '9H', 'DURVAL & AMIGOS', 'ARENA PAPELAO', 'Ambos', 7, 6),
  ...m('2', '10/01/2026', '9H30', 'CINQUENTAO DE GUARAREMA', 'CAMPO DO ITAPEMA', 'Ambos', 2, 2),
  ...m('3', '17/01/2026', '08H', 'FAMILIA PARATEI', 'CAMPO DA BALANÇA', 'Master', 4, 3),
  ...m('4', '17/01/2026', '9H', 'FAVELA FC', 'CAMPO DO NOVA ERA', 'Veterano/Esporte', 0, 1),
  ...m('5', '24/01/2026', '8H', 'FMS CLARIANT', 'CAMPO DA CLARIANT', 'Ambos', 3, 3),
  ...m('6', '24/01/2026', '9H', 'ADC 9 DE JULHO', 'CDC 9 DE JULHO', 'Master', 1, 2),
  ...m('7', '31/01/2026', '8H', 'OAB SUZANO', 'CAMPO DO BOA VISTA', 'Veterano/Esporte', 6, 1),
  ...m('8', '31/01/2026', '9H', 'AMIGOS DO PASCHOAL', 'TREZE DE MAIO', 'Master', 3, 4),
  ...m('9', '07/02/2026', '8H', 'FUTRESENHA', 'TREZE DE MAIO', 'Master', 1, 4),
  ...m('10', '07/02/2026', '7H', 'FENIX', 'CAMPO DA IBAR', 'Veterano/Esporte', 4, 1),
  ...m('11', '14/02/2026', '8H', 'JOGO ENTRE NOS', 'TREZE DE MAIO', 'Ambos', 2, 1),
  ...m('12', '21/02/2026', '8H', 'AIR PRODUCTS', 'TREZE DE MAIO', 'Veterano/Esporte', 4, 1),
  ...m('13', '21/02/2026', '9H30', 'MASTER VILA', 'CAMPO DO HOSPITAL DR. ARNALDO', 'Master', 0, 0),
  ...m('14', '28/02/2026', '9H30', 'NAÇÃO ISABELENSE', 'CAMPO DO SIEC SANTA ISABEL', 'Veterano/Esporte', 5, 0),
  ...m('15', '28/02/2026', '8H', 'BRAZ CUBAS FUTEBOL CLUBE', 'TREZE DE MAIO', 'Master', 3, 2),
  ...m('16', '07/03/2026', '8H', 'JAVALI REI FC', 'TREZE DE MAIO', 'Veterano/Esporte', 4, 1),
  ...m('17', '07/03/2026', '8H', 'DINOS GUARAREMA', 'CAMPO MARACATU', 'Master', 2, 3),
  ...m('18', '14/03/2026', '9H30', 'SUZANOPOLIS', 'CAMPO DO SUZANOPOLIS', 'Veterano/Esporte'),
  ...m('19', '14/03/2026', '8H', 'SUZANINHO', 'TREZE DE MAIO', 'Master'),
  ...m('20', '21/03/2026', '8H', 'OAB SUZANO', 'CAMPO DO BOA VISTA', 'Veterano/Esporte'),
  ...m('21', '21/03/2026', '8H', 'EC AMIGOS VILA CURUÇA', 'TREZE DE MAIO', 'Master'),
  ...m('22', '28/03/2026', '8H', 'AIR PRODUCTS', 'CAMPO DO SÃO FRANCISCO', 'Veterano/Esporte'),
  ...m('23', '28/03/2026', '8H', 'EC DINOS D TEA', 'TREZE DE MAIO', 'Master'),
  ...m('24', '04/04/2026', '8H', 'JOGO ENTRE NOS', 'TREZE DE MAIO', 'Ambos'),
  ...m('25', '11/04/2026', '8H', 'FENIX', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('26', '11/04/2026', '9H', 'TIME GRIM', 'CAMPO VILA DO RODEIO', 'Master'),
  ...m('27', '18/04/2026', '8H', 'A A BELO VALLE', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('28', '18/04/2026', '10H30', 'URUPES', 'CAMPO DO URUPES', 'Master'),
  ...m('29', '25/04/2026', '7H30', 'REAL MASTER', 'CAMPO DO HOSPITAL DR. ARNALDO', 'Veterano/Esporte'),
  ...m('30', '25/04/2026', '8H', 'MASTER VILA', 'TREZE DE MAIO', 'Master'),
  ...m('31', '26/04/2026', '9H', 'S. E SALESOPOLIS', 'CAMPO DO S.E SALESOPOLIS', 'Ambos'),
  ...m('32', '02/05/2026', '8H', 'RESENHA', 'CAMPO JORGE MITRE SANTA ISABEL', 'Veterano/Esporte'),
  ...m('33', '02/05/2026', '8H', 'ADC 9 DE JULHO', 'TREZE DE MAIO', 'Master'),
  ...m('34', '09/05/2026', '8H', 'JOGO ENTRE NOS', 'TREZE DE MAIO', 'Ambos'),
  ...m('35', '16/05/2026', '8H', 'PARADAO XV', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('36', '16/05/2026', '9H30', 'CINQUENTAO DE GUARAREMA', 'CAMPO DO ITAPEMA', 'Master'),
  ...m('37', '23/05/2026', '8H', 'PÉ DE RATO', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('38', '23/05/2026', '8H30', 'MEC', 'ARENA MEC', 'Master'),
  ...m('39', '30/05/2026', '8H', 'SUZANOPOLIS', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('40', '30/05/2026', '9H30', 'EC VILA JULIA', 'ARENA VILA JULIA', 'Master'),
  ...m('41', '06/06/2026', '8H', 'CAPIM CANELA', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('42', '06/06/2026', '8H', 'EC TRES MARIAS', 'EC TRES MARIAS', 'Master'),
  ...m('43', '13/06/2026', '9H30', 'COMERCIAL', 'CAMPO DO COMERCIAL', 'Veterano/Esporte'),
  ...m('44', '13/06/2026', '8H', 'BRAZ CUBAS FUTEBOL CLUBE', 'TREZE DE MAIO', 'Master'),
  ...m('45', '20/06/2026', '8H', 'REAL MASTER', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('46', '20/06/2026', '8H', 'FAMILIA PARATEI', 'CAMPO DA BALANÇA', 'Master'),
  ...m('47', '28/06/2026', '8H30', 'TUIUTI FC', 'ESTADIO DE TUIUTI', 'Ambos'),
  ...m('48', '04/07/2026', '08H', 'FUTGOLE', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('49', '04/07/2026', '8H30', 'COROAS DE POA', 'ARENA SAO DOMINGOS', 'Master'),
  ...m('50', '11/07/2026', '9H', 'FAVELA FC', 'CAMPO DO NOVA ERA', 'Veterano/Esporte'),
  ...m('51', '11/07/2026', '8H', 'CINQUENTAO DE GUARAREMA', 'TREZE DE MAIO', 'Master'),
  ...m('52', '18/07/2026', '8H', 'AIR PRODUCTS', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('53', '18/07/2026', '8H', 'OAB SUZANO', 'CAMPO DO BOA VISTA', 'Master'),
  ...m('54', '25/07/2026', '9H30', 'PILANTRAS FC', 'COMPLEXO REI PELÉ', 'Veterano/Esporte'),
  ...m('55', '25/07/2026', '8H', 'TIME GRIM', 'TREZE DE MAIO', 'Master'),
  ...m('56', '01/08/2026', '10H30', 'RENEGADOS', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('57', '01/08/2026', '8H', 'BAGAÇO DA CANA', 'TREZE DE MAIO', 'Master'),
  ...m('58', '08/08/2026', '8H', 'JOGO ENTRE NOS', 'TREZE DE MAIO', 'Ambos'),
  ...m('59', '15/08/2026', '8H', 'DINOS GUARAREMA', 'CAMPO A DEFINIR - GUARAREMA', 'Master'),
  ...m('60', '22/08/2026', '8H', 'FMS CLARIANT', 'CAMPO DA CLARIANT', 'Veterano/Esporte'),
  ...m('61', '29/08/2026', '10H', 'MASTER VILA', 'CAMPO DO HOSPITAL DR. ARNALDO', 'Master'),
  ...m('62', '05/09/2026', '9H30', 'STIGMATA', 'CAMPO DO GEVI ITAQUA', 'Veterano/Esporte'),
  ...m('63', '12/09/2026', '8H', 'COROAS DE POA', 'TREZE DE MAIO', 'Master'),
  ...m('64', '19/09/2026', '8H', 'FAVELA FC', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('65', '19/09/2026', '7H', 'GE COLORADO', 'CDC UNIAO DA FÉ', 'Master'),
  ...m('66', '03/10/2026', '07H30', 'FAMILIA MONTANHA FC', 'CAMPO DO MOOQUEM', 'Master'),
  ...m('67', '10/10/2026', '8H', 'JOGO ENTRE NOS', 'TREZE DE MAIO', 'Ambos'),
  ...m('68', '17/10/2026', '8H', 'AIR PRODUCTS', 'CAMPO DO SAO FRANCISCO', 'Veterano/Esporte'),
  ...m('69', '17/10/2026', '8H', 'SUZANINHO', 'TREZE DE MAIO', 'Master'),
  ...m('70', '24/10/2026', '8H', 'STIGMATA', 'TREZE DE MAIO', 'Veterano/Esporte'),
  ...m('71', '19/12/2026', '8H', 'JOGO ENTRE NOS', 'TREZE DE MAIO', 'Ambos'),
  ...m('72', '26/12/2026', '8H', 'JOGO ENTRE NOS', 'TREZE DE MAIO', 'Ambos'),
].flat();

export const initialTransactions: Transaction[] = [];

export const initialUnpaidMembers: UnpaidMember[] = [];

export const initialStandings: TeamStandings[] = [];
