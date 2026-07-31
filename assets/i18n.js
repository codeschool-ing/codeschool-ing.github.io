/* ==========================================================================
   codeschool.ing — dicionários (en · es)

   O português NÃO tem dicionário: ele é a origem, e a chave de cada entrada
   é o próprio texto em português. Qualquer chave ausente cai de volta no
   português sozinha — então este arquivo pode crescer aos poucos sem que a
   tela quebre no meio do caminho.

   Aqui ficam a interface, as trilhas e os depoimentos. O catálogo — nome,
   resumo, ementa, tópicos e requisitos dos 86 cursos — está separado em
   assets/i18n-cursos-en.js e assets/i18n-cursos-es.js: são 2.203 strings
   por idioma, mais texto que todo o resto do site somado.

   O que NÃO se traduz, de propósito: a marca ("codeschool.ing"), os
   nomes das redes sociais, o endereço de e-mail, o telefone e a linha de
   comando decorativa do terminal do topo. São nomes próprios e dados de
   contato — traduzi-los quebraria a identidade ou o dado.
   ========================================================================== */
window.I18N = {

  /* =====================================================================
     ENGLISH
     ===================================================================== */
  en: {
    ui: {
      /* --- frases partidas por <strong>/<span> --- */
      'Aprenda no seu ritmo,': 'Learn at your own pace,',
      'com': 'with',
      'Formação em tecnologia organizada em': 'Technology training organised into',
      ':\n        você sabe exatamente qual curso fazer primeiro, o que vem depois e\n        onde cada etapa vai te levar. Cursos de base valem para mais de uma\n        carreira — você não estuda a mesma coisa duas vezes.': ': you know exactly which course to take first, what comes next and where each step leads. Foundation courses count towards more than one career — you never study the same thing twice.',
      'trilhas ·': 'tracks ·',
      'inscrever --email': 'subscribe --email',
      'A cada curso concluído, certificado com código de validação para anexar ao currículo.':
        'Every finished course earns a certificate with a validation code to attach to your CV.',
      'Deixe seu contato: a gente ajuda a escolher o plano certo e explica as formas de pagamento. Sem compromisso.':
        'Leave your contact details: we will help you pick the right plan and explain the payment options. No commitment.',
      'Sim — os cursos são práticos e você acompanha fazendo. Um computador simples com internet e um navegador já resolvem.':
        'Yes — the courses are hands-on and you follow along by doing. A simple computer with internet and a browser is all you need.',
      'As aulas ficam gravadas para você assistir quando puder, e há encontros ao vivo para dúvidas e prática dirigida.':
        'Classes are recorded so you can watch whenever you can, and there are live sessions for questions and guided practice.',
      'Não. A trilha é uma recomendação de ordem — se você só precisa de um curso dela, assista só ele.':
        'No. A track is a recommended order — if you only need one course from it, watch just that one.',
      'Emitimos certificado de curso livre com carga horária e código de validação, aceito para comprovação de qualificação profissional.':
        'We issue a continuing-education certificate with the workload and a validation code, accepted as proof of professional qualification.',
      'seu nome completo': 'your full name',
      'voce@exemplo.com': 'you@example.com',
      'Ir para a seção 1': 'Go to section 1',
      'Ir para a seção 2': 'Go to section 2',
      'Ir para a seção 3': 'Go to section 3',
      'Ir para a seção 4': 'Go to section 4',
      'Ir para a seção 5': 'Go to section 5',
      'Ir para a seção 6': 'Go to section 6',
      'Ir para a seção 7': 'Go to section 7',
      /* --- navegação e cabeçalho --- */
      'Comece agora': 'Start now',
      'Trilhas': 'Tracks',
      'Cursos': 'Courses',
      'Planos': 'Plans',
      'Alunos': 'Students',
      'Contato': 'Contact',
      'Área do aluno': 'Student area',
      'Escolher idioma': 'Choose language',
      'Mudar para tema claro': 'Switch to light theme',
      'Abrir menu': 'Open menu',
      'codeschool.ing — Cursos e trilhas de programação':
        'codeschool.ing — Programming courses and learning tracks',
      'Escola de tecnologia online: cursos de programação, dados, infraestrutura, segurança e IA organizados em trilhas de formação. Estude no seu ritmo, com professor acompanhando.':
        'Online tech school: courses in programming, data, infrastructure, security and AI, organised into learning tracks. Study at your own pace, with a teacher alongside you.',

      /* --- hero --- */
      'Escola de tecnologia': 'Tech school',
      'a trilha certa do começo': 'the right track from day one',
      'trilhas': 'tracks',
      'Ver as trilhas →': 'See the tracks →',
      'Catálogo de cursos': 'Course catalogue',
      'cursos': 'courses',
      'trilhas de formação': 'learning tracks',
      'horas de conteúdo': 'hours of content',
      'aluno@codeschool:~': 'student@codeschool:~',
      'cursos ·': 'courses ·',

      /* --- trilhas --- */
      'por carreira': 'by career',
      'por tecnologia': 'by technology',
      'Trilhas anteriores': 'Previous tracks',
      'Próximas trilhas': 'Next tracks',
      'Trilhas por carreira': 'Tracks by career',
      'Trilhas por tecnologia': 'Tracks by technology',
      'Ver níveis anteriores': 'See previous levels',
      'Ver próximos níveis': 'See next levels',
      'nível': 'level',
      'níveis': 'levels',
      'chegada': 'finish',
      'você escolhe': 'you choose',
      'de carga': 'total',
      'neste caminho': 'on this path',
      'a': 'to',
      'deles com ordem livre': 'of them in free order',
      'depois de': 'after',
      'em': 'in',
      'trilha': 'track',
      'curso avulso': 'standalone course',
      'horas': 'hours',
      'curso': 'course',

      /* --- catálogo --- */
      'Portfólio': 'Portfolio',
      'buscar curso...': 'search courses...',
      'Buscar curso': 'Search courses',
      'Filtrar por área': 'Filter by area',
      'Filtros anteriores': 'Previous filters',
      'Próximos filtros': 'Next filters',
      'nenhum curso encontrado — tente outro termo.': 'no course found — try another term.',
      'todas': 'all',
      'fundamentos': 'fundamentals',
      'programacao': 'programming',
      'ia': 'ai',
      'frontend': 'frontend',
      'backend': 'backend',
      'dados': 'data',
      'infra': 'infrastructure',
      'arquitetura': 'architecture',
      'gestao': 'management',
      'seguranca': 'security',
      'qualidade': 'quality',
      'iniciante': 'beginner',
      'intermediário': 'intermediate',
      'avançado': 'advanced',

      /* --- modal do curso --- */
      'área': 'area',
      'carga': 'workload',
      'o que você aprende': 'what you learn',
      'conteúdo detalhado': 'detailed contents',
      'tópicos': 'topics',
      'pré-requisitos': 'prerequisites',
      'abre caminho para': 'opens the way to',
      /* frases inteiras: em inglês o qualificador vem antes do substantivo */
      'faz parte de {n} trilha de carreira': 'part of {n} career track',
      'faz parte de {n} trilhas de carreira': 'part of {n} career tracks',
      'faz parte de {n} trilha de tecnologia': 'part of {n} technology track',
      'faz parte de {n} trilhas de tecnologia': 'part of {n} technology tracks',
      'e de {n} trilha de tecnologia': 'and of {n} technology track',
      'e de {n} trilhas de tecnologia': 'and of {n} technology tracks',
      'Comece agora →': 'Start now →',
      'Fechar': 'Close',

      /* --- planos --- */
      '[planos de exemplo — valores e benefícios ainda a definir]': '[sample plans — prices and benefits still to be defined]',
      'Essencial': 'Essential',
      'Para quem quer começar por um assunto só.': 'For anyone who wants to start with a single subject.',
      '/mês': '/month',
      'Uma trilha à sua escolha': 'One track of your choice',
      'Aulas gravadas e material de apoio': 'Recorded classes and support material',
      'Exercícios com correção automática': 'Exercises with automatic grading',
      'Certificado a cada curso concluído': 'A certificate for every course finished',
      'Quero este plano →': 'I want this plan →',
      'mais escolhido': 'most chosen',
      'Completo': 'Complete',
      'Acesso ao catálogo inteiro, sem escolher agora.': 'Access to the whole catalogue, without choosing now.',
      'Todas as trilhas e todos os cursos': 'Every track and every course',
      'Encontros ao vivo para tirar dúvidas': 'Live sessions for your questions',
      'Projetos avaliados por um professor': 'Projects reviewed by a teacher',
      'Equipes': 'Teams',
      'Para empresas que vão formar mais de uma pessoa.': 'For companies training more than one person.',
      '/mês por pessoa': '/month per person',
      'Tudo do plano Completo': 'Everything in the Complete plan',
      'Painel de acompanhamento da turma': 'A dashboard to follow the group',
      'Trilha desenhada com a empresa': 'A track designed with the company',
      'Nota fiscal e pagamento centralizado': 'Invoicing and centralised payment',
      'Falar com a gente →': 'Talk to us →',

      /* --- alunos --- */
            /* --- alunos --- */
      'Quem passou por aqui': 'People who studied here',
      '[depoimentos de exemplo — aguardam os relatos reais]':
        '[sample testimonials — waiting for the real ones]',
      'Escolher trilha': 'Choose a track',
      'trilhas por carreira': 'career tracks',
      'trilhas por tecnologia': 'technology tracks',
      'vídeo em breve': 'video coming soon',
      'assistir à apresentação do curso': 'watch the course introduction',
      'apresentação do curso': 'course introduction',

      /* --- matrícula --- */
      'Sua assinatura começa com um oi': 'Your subscription starts with a hello',
      'nome': 'name',
      'whatsapp ou e-mail': 'whatsapp or e-mail',
      'plano': 'plan',
      'ainda não sei — quero orientação': 'not sure yet — I would like guidance',
      'Preciso ter computador em casa?': 'Do I need a computer at home?',
      'As aulas são ao vivo ou gravadas?': 'Are classes live or recorded?',
      'As aulas ficam gravadas para você assistir quando puder, e há encontros ao vivo para dúvidas e exercícios em grupo.':
        'Classes are recorded so you can watch whenever you can, and there are live sessions for questions and group exercises.',
      'Preciso fazer a trilha inteira?': 'Do I have to take the whole track?',
      'O certificado é reconhecido?': 'Is the certificate recognised?',
      'Emitimos certificado de curso livre com carga horária e código de validação.':
        'We issue a continuing-education certificate with the workload and a validation code.',

      /* --- contato e rodapé --- */
      'Prefere falar com a gente?': 'Rather talk to us?',
      'Dúvidas sobre cursos, trilhas ou certificados — escreva e a gente responde.':
        'Questions about courses, tracks or certificates — write to us and we will reply.',
      'e-mail': 'e-mail',
      '// newsletter': '// newsletter',
      'Novas turmas, cursos e conteúdo gratuito de tecnologia. Sem spam.':
        'New classes, courses and free tech content. No spam.',
      'assinar →': 'subscribe →',
      'seu e-mail': 'your e-mail',
      /* --- menu do faq, portfólio e terminal --- */
      'FAQ': 'FAQ',
      'Tudo o que está dentro das trilhas, curso a curso. Procure pelo nome, filtre por área ou abra um para ver a ementa.': 'Everything inside the tracks, course by course. Search by name, filter by area or open one to read the syllabus.',
      '… e mais {n} trilhas de carreira': '… and {n} more career tracks',
      'precisa antes:': 'needs first:',
      /* --- faq e modal de inscrição --- */
      'Perguntas frequentes': 'Frequently asked questions',
      'O que a gente mais ouve — e, marcado, o que ainda está sendo definido.': 'What we hear the most — and, flagged, what is still being decided.',
      'Posso cancelar quando quiser?': 'Can I cancel whenever I want?',
      'Sim: a assinatura é mensal e você cancela sozinho, sem falar com ninguém. O acesso continua até o fim do período já pago.': 'Yes: the subscription is monthly and you cancel it yourself, without talking to anyone. Access lasts until the end of the period already paid for.',
      '[resposta de exemplo — a política de cancelamento ainda será definida]': '[sample answer — the cancellation policy is still to be defined]',
      'Quais são as formas de pagamento?': 'Which payment methods are accepted?',
      'Cartão de crédito e Pix, com renovação automática no cartão.': 'Credit card and Pix, renewing automatically on the card.',
      '[resposta de exemplo — os meios de pagamento ainda serão definidos]': '[sample answer — payment methods are still to be defined]',
      'Dá para comprar um curso avulso, sem assinar?': 'Can I buy a single course without subscribing?',
      'Não. O acesso é por assinatura, e ela abre o catálogo conforme o plano.': 'No. Access comes with a subscription, which opens the catalogue according to the plan.',
      '[resposta de exemplo — a venda avulsa ainda será decidida]': '[sample answer — selling single courses is still to be decided]',
      'Minha empresa pode contratar para a equipe?': 'Can my company subscribe for the team?',
      'Pode: é o plano Equipes, com preço por pessoa e painel de acompanhamento da turma.': 'It can: that is the Teams plan, priced per person and with a dashboard to follow the group.',
      '[resposta de exemplo — nota fiscal e condições ainda serão definidas]': '[sample answer — invoicing and terms are still to be defined]',
      'assinatura.novo': 'subscription.new',
      'feito no Brasil · para qualquer lugar': 'made in Brazil · for anywhere',
    },

    trilhas: {
      frontend: { objetivo:
          'The complete training for whoever builds what the user sees: from the first static page to the published app. Sequence based on the community Front-end roadmap at roadmap.sh, adapted to our method.',
        nome: 'Front-end Development', saida: 'Junior Front-end Developer' },
      backend: {
        objetivo:
          'Training for whoever builds what holds the application up: data, APIs, servers and scale. Based on the community Back-end roadmap at roadmap.sh — the server language is your choice, and the path converges again after it.',
        nome: 'Back-end Development', saida: 'Junior Back-end Developer',
        etapas: { 3: {
          escolha: 'the server language',
          nota: 'Master one properly before jumping to another. The rest of the track is the same on any path.',
          opcoes: ['JavaScript / Node.js', 'Python', 'Java', 'Go'],
        } },
      },
      devops: { objetivo:
          'Training for whoever keeps the operation running: systems, networks, cloud, automation and observability. Sequence based on the community DevOps roadmap at roadmap.sh. Half the courses come from earlier tracks — anyone who did Front-end or Back-end starts halfway there.',
        nome: 'DevOps and SRE', saida: 'Junior DevOps Engineer / SRE' },
      dados: { objetivo:
          'Training for whoever builds the infrastructure behind decisions: modelling, pipelines, big data and governance. Sequence based on the community Data Engineer roadmap at roadmap.sh, which recommends Python and SQL as prerequisites. Half the courses come from earlier tracks.',
        nome: 'Data Engineering', saida: 'Junior Data Engineer' },
      'redes-infra': { objetivo:
          'Training for whoever gets the packet through: addressing, routing, wi-fi, security and automation. Sequence based on the community Network Engineer roadmap at roadmap.sh — seven of the eleven courses come from earlier tracks.',
        nome: 'Networks and Infrastructure', saida: 'Junior Network Engineer' },
      prompt: { objetivo:
          'The shortest track in the catalogue and the only one that needs no programming: whoever writes, supports, teaches or decides needs this too. Covers the whole community Prompt Engineering roadmap at roadmap.sh, including the AI Red Teaming one it references.',
        nome: 'Prompt Engineering', saida: 'Prompt Engineering Specialist' },
      ia: { objetivo:
          'Training for whoever builds products with AI: model choice, embeddings, RAG, agents, MCP, evaluation and multimodal. Sequence based on the community AI Engineer roadmap at roadmap.sh — the programming foundation comes from Python.',
        nome: 'AI Engineering', saida: 'Junior AI Engineer' },
      'arquitetura-software': { objetivo:
          'The only track in the catalogue that requires another one first: it is a career continuation, not an entry point. For whoever already develops and is about to start deciding — patterns, modelling, enterprise integration, management and communication. Sequence based on the community Software Architect roadmap at roadmap.sh, which asks for Back-end as a prerequisite.',
        nome: 'Software Architecture', saida: 'Software Architect' },
      'ti-suporte': { objetivo:
          'The school\'s entry point and the first track that requires nothing: it starts with the case open and ends with you supporting, diagnosing and documenting. Covers the Fundamental IT Skills and Operating Systems blocks and the networking base of the community Cyber Security roadmap at roadmap.sh.',
        nome: 'IT Fundamentals and Support', saida: 'Support Technician / Help Desk' },
      seguranca: { objetivo:
          'Attack and defence on the same path: fundamentals, cryptography, threats, hardening, SOC, penetration testing and cloud. It is the larger half of the community Cyber Security roadmap at roadmap.sh — the other half became the IT Fundamentals and Support track, which serves as its base.',
        nome: 'Cyber Security', saida: 'Information Security Analyst' },
      devsecops: { objetivo:
          'The cheapest track in the catalogue: it sits at the intersection of DevOps and Security, and 80% of it already exists. Security that runs on every commit — secure code, threat modelling, pipeline scanning, hardened images and a supply chain under control. Sequence based on the community DevSecOps roadmap at roadmap.sh.',
        nome: 'DevSecOps', saida: 'DevSecOps Engineer' },
      bi: { objetivo:
          'The track for whoever wants to work with data without becoming a programmer: statistics, real Excel, SQL, visualisation and the conversation with the business. Sequence based on the community BI Analyst roadmap at roadmap.sh. It is the track that brought in the statistics the whole catalogue was missing.',
        nome: 'Business Intelligence', saida: 'BI Analyst / Data Analyst' },
      qa: { objetivo:
          'Training for whoever makes sure the software does what it promises — and holds up to what was promised for it. Sequence based on the community QA Engineer roadmap at roadmap.sh. As in BI, nobody needs to program to start: there are 330h before the first programming course, and it is the catalogue\'s second entry point for career changers.',
        nome: 'Software Quality and Testing', saida: 'Junior QA Engineer' },
      'python-tec': {
        objetivo:
          'For whoever wants to master the language, not a job title. The trunk is the same for everyone — the language properly learned, with version control — and at the end you choose where to apply it: on the server, in data or in AI. Based on the community Python roadmap at roadmap.sh.',
        nome: 'Python', saida: 'Command of Python',
        etapas: { 3: {
          escolha: 'where to apply Python',
          nota: 'The track does not converge again here: each path is a different application of the same language.',
          opcoes: ['Server and APIs', 'Data', 'AI'],
        } },
      },
      'go-tec': {
        objetivo:
          'The language Docker, Kubernetes and Terraform were written in. The trunk runs from syntax to concurrency — the part of Go that does not exist in other languages — and at the end you pick your side: build services, or build the tooling. Based on the public Go roadmap at roadmap.sh.',
        nome: 'Go', saida: 'Command of Go',
        etapas: { 3: {
          escolha: 'which side of Go',
          nota: 'Both start from the same concurrency: one builds the service, the other builds the tooling that runs it.',
          opcoes: ['Services and APIs', 'Tooling and Infrastructure'],
        } },
      },
      'sql-tec': {
        objetivo:
          'The technology that employs the most and demands the least: SQL is learned without knowing how to program. It is the track for whoever comes from admin, accounting or management and is tired of asking someone else for a report. After the database, you choose what to do with the data. Based on the community SQL and PostgreSQL roadmaps at roadmap.sh.',
        nome: 'SQL and Databases', saida: 'Command of SQL and databases',
        etapas: { 2: {
          escolha: 'what to do with the data',
          nota: 'Both paths start from the same database: one looks at the decision, the other at the volume.',
          opcoes: ['Analytics and BI', 'Data Engineering'],
        } },
      },
    },

    /* Placeholders enquanto os relatos reais não chegam — traduzidos junto
       com o resto para a tela não sair meio em português. */
    depoimentos: [
      {
        texto: '[Edit: real student testimonial.] I started not knowing what HTML was and finished the track with three projects published in my portfolio.',
        autor: '[Student name]',
        contexto: 'Front-end Development track · [year] class',
      },
      {
        texto: '[Edit: real student testimonial.] The Git course changed the way I work — today I collaborate on projects without fear of breaking anything.',
        autor: '[Student name]',
        contexto: 'Git and Version Control · [year] class',
      },
      {
        texto: '[Edit: real student testimonial.] The AI in Development part surprised me most: it changed my productivity at work.',
        autor: '[Student name]',
        contexto: 'AI in Development · [year] class',
      },
    ],

    /* o catálogo (nome, resumo, ementa, tópicos, requisitos) vive em
       assets/i18n-cursos-en.js — sozinho ele pesa mais que este arquivo */
    cursos: {},
  },

  /* =====================================================================
     ESPAÑOL
     ===================================================================== */
  es: {
    ui: {
      /* --- frases partidas por <strong>/<span> --- */
      'Aprenda no seu ritmo,': 'Aprende a tu ritmo,',
      'com': 'con',
      'Formação em tecnologia organizada em': 'Formación en tecnología organizada en',
      ':\n        você sabe exatamente qual curso fazer primeiro, o que vem depois e\n        onde cada etapa vai te levar. Cursos de base valem para mais de uma\n        carreira — você não estuda a mesma coisa duas vezes.': ': sabes exactamente qué curso hacer primero, qué viene después y adónde te lleva cada etapa. Los cursos de base sirven para más de una carrera — nunca estudias lo mismo dos veces.',
      'trilhas ·': 'itinerarios ·',
      'inscrever --email': 'suscribir --correo',
      'A cada curso concluído, certificado com código de validação para anexar ao currículo.':
        'Por cada curso terminado, un certificado con código de validación para adjuntar al currículum.',
      'Deixe seu contato: a gente ajuda a escolher o plano certo e explica as formas de pagamento. Sem compromisso.':
        'Déjanos tu contacto: te ayudamos a elegir el plan correcto y te explicamos las formas de pago. Sin compromiso.',
      'Sim — os cursos são práticos e você acompanha fazendo. Um computador simples com internet e um navegador já resolvem.':
        'Sí — los cursos son prácticos y avanzas haciendo. Un ordenador sencillo con internet y un navegador ya bastan.',
      'As aulas ficam gravadas para você assistir quando puder, e há encontros ao vivo para dúvidas e prática dirigida.':
        'Las clases quedan grabadas para verlas cuando puedas, y hay encuentros en vivo para dudas y práctica guiada.',
      'Não. A trilha é uma recomendação de ordem — se você só precisa de um curso dela, assista só ele.':
        'No. El itinerario es una recomendación de orden — si solo necesitas un curso de él, mira solo ese.',
      'Emitimos certificado de curso livre com carga horária e código de validação, aceito para comprovação de qualificação profissional.':
        'Emitimos un certificado de formación continua con carga horaria y código de validación, aceptado como comprobante de cualificación profesional.',
      'seu nome completo': 'tu nombre completo',
      'voce@exemplo.com': 'tu@ejemplo.com',
      'Ir para a seção 1': 'Ir a la sección 1',
      'Ir para a seção 2': 'Ir a la sección 2',
      'Ir para a seção 3': 'Ir a la sección 3',
      'Ir para a seção 4': 'Ir a la sección 4',
      'Ir para a seção 5': 'Ir a la sección 5',
      'Ir para a seção 6': 'Ir a la sección 6',
      'Ir para a seção 7': 'Ir a la sección 7',
      'Comece agora': 'Empieza ahora',
      'Trilhas': 'Itinerarios',
      'Cursos': 'Cursos',
      'Planos': 'Planes',
      'Alunos': 'Alumnos',
      'Contato': 'Contacto',
      'Área do aluno': 'Área del alumno',
      'Escolher idioma': 'Elegir idioma',
      'Mudar para tema claro': 'Cambiar al tema claro',
      'Abrir menu': 'Abrir menú',
      'codeschool.ing — Cursos e trilhas de programação':
        'codeschool.ing — Cursos e itinerarios de programación',
      'Escola de tecnologia online: cursos de programação, dados, infraestrutura, segurança e IA organizados em trilhas de formação. Estude no seu ritmo, com professor acompanhando.':
        'Escuela de tecnología en línea: cursos de programación, datos, infraestructura, seguridad e IA organizados en itinerarios de formación. Estudia a tu ritmo, con un profesor acompañándote.',

      'Escola de tecnologia': 'Escuela de tecnología',
      'a trilha certa do começo': 'el itinerario correcto desde el principio',
      'trilhas': 'itinerarios',
      'Ver as trilhas →': 'Ver los itinerarios →',
      'Catálogo de cursos': 'Catálogo de cursos',
      'cursos': 'cursos',
      'trilhas de formação': 'itinerarios de formación',
      'horas de conteúdo': 'horas de contenido',
      'aluno@codeschool:~': 'alumno@codeschool:~',
      'cursos ·': 'cursos ·',

      'por carreira': 'por carrera',
      'por tecnologia': 'por tecnología',
      'Trilhas anteriores': 'Itinerarios anteriores',
      'Próximas trilhas': 'Itinerarios siguientes',
      'Trilhas por carreira': 'Itinerarios por carrera',
      'Trilhas por tecnologia': 'Itinerarios por tecnología',
      'Ver níveis anteriores': 'Ver niveles anteriores',
      'Ver próximos níveis': 'Ver niveles siguientes',
      'nível': 'nivel',
      'níveis': 'niveles',
      'chegada': 'meta',
      'você escolhe': 'tú eliges',
      'de carga': 'de carga',
      'neste caminho': 'en este camino',
      'a': 'a',
      'deles com ordem livre': 'de ellos en orden libre',
      'depois de': 'después de',
      'em': 'en',
      'trilha': 'itinerario',
      'curso avulso': 'curso suelto',
      'horas': 'horas',
      'curso': 'curso',

      'Portfólio': 'Portafolio',
      'buscar curso...': 'buscar curso...',
      'Buscar curso': 'Buscar curso',
      'Filtrar por área': 'Filtrar por área',
      'Filtros anteriores': 'Filtros anteriores',
      'Próximos filtros': 'Filtros siguientes',
      'nenhum curso encontrado — tente outro termo.': 'ningún curso encontrado — prueba otro término.',
      'todas': 'todas',
      'fundamentos': 'fundamentos',
      'programacao': 'programación',
      'ia': 'ia',
      'frontend': 'frontend',
      'backend': 'backend',
      'dados': 'datos',
      'infra': 'infraestructura',
      'arquitetura': 'arquitectura',
      'gestao': 'gestión',
      'seguranca': 'seguridad',
      'qualidade': 'calidad',
      'iniciante': 'inicial',
      'intermediário': 'intermedio',
      'avançado': 'avanzado',

      'área': 'área',
      'carga': 'carga',
      'o que você aprende': 'lo que vas a aprender',
      'conteúdo detalhado': 'contenido detallado',
      'tópicos': 'temas',
      'pré-requisitos': 'requisitos previos',
      'abre caminho para': 'abre camino a',
      'faz parte de {n} trilha de carreira': 'forma parte de {n} itinerario de carrera',
      'faz parte de {n} trilhas de carreira': 'forma parte de {n} itinerarios de carrera',
      'faz parte de {n} trilha de tecnologia': 'forma parte de {n} itinerario de tecnología',
      'faz parte de {n} trilhas de tecnologia': 'forma parte de {n} itinerarios de tecnología',
      'e de {n} trilha de tecnologia': 'y de {n} itinerario de tecnología',
      'e de {n} trilhas de tecnologia': 'y de {n} itinerarios de tecnología',
      'Comece agora →': 'Empieza ahora →',
      'Fechar': 'Cerrar',

      /* --- planos --- */
      '[planos de exemplo — valores e benefícios ainda a definir]': '[planes de ejemplo — precios y beneficios aún por definir]',
      'Essencial': 'Esencial',
      'Para quem quer começar por um assunto só.': 'Para quien quiere empezar por un solo tema.',
      '/mês': '/mes',
      'Uma trilha à sua escolha': 'Un itinerario a tu elección',
      'Aulas gravadas e material de apoio': 'Clases grabadas y material de apoyo',
      'Exercícios com correção automática': 'Ejercicios con corrección automática',
      'Certificado a cada curso concluído': 'Certificado por cada curso terminado',
      'Quero este plano →': 'Quiero este plan →',
      'mais escolhido': 'el más elegido',
      'Completo': 'Completo',
      'Acesso ao catálogo inteiro, sem escolher agora.': 'Acceso a todo el catálogo, sin elegir ahora.',
      'Todas as trilhas e todos os cursos': 'Todos los itinerarios y todos los cursos',
      'Encontros ao vivo para tirar dúvidas': 'Encuentros en vivo para resolver dudas',
      'Projetos avaliados por um professor': 'Proyectos evaluados por un profesor',
      'Equipes': 'Equipos',
      'Para empresas que vão formar mais de uma pessoa.': 'Para empresas que van a formar a más de una persona.',
      '/mês por pessoa': '/mes por persona',
      'Tudo do plano Completo': 'Todo lo del plan Completo',
      'Painel de acompanhamento da turma': 'Panel de seguimiento del grupo',
      'Trilha desenhada com a empresa': 'Itinerario diseñado con la empresa',
      'Nota fiscal e pagamento centralizado': 'Factura y pago centralizado',
      'Falar com a gente →': 'Hablar con nosotros →',
      'Quem passou por aqui': 'Quienes pasaron por aquí',
      '[depoimentos de exemplo — aguardam os relatos reais]':
        '[testimonios de ejemplo — a la espera de los reales]',
      'Escolher trilha': 'Elegir itinerario',
      'trilhas por carreira': 'itinerarios por carrera',
      'trilhas por tecnologia': 'itinerarios por tecnología',
      'vídeo em breve': 'video muy pronto',
      'assistir à apresentação do curso': 'ver la presentación del curso',
      'apresentação do curso': 'presentación del curso',

      'Sua assinatura começa com um oi': 'Tu suscripción empieza con un hola',
      'nome': 'nombre',
      'whatsapp ou e-mail': 'whatsapp o correo',
      'plano': 'plan',
      'ainda não sei — quero orientação': 'todavía no lo sé — quiero orientación',
      'Preciso ter computador em casa?': '¿Necesito tener ordenador en casa?',
      'As aulas são ao vivo ou gravadas?': '¿Las clases son en vivo o grabadas?',
      'As aulas ficam gravadas para você assistir quando puder, e há encontros ao vivo para dúvidas e exercícios em grupo.':
        'Las clases quedan grabadas para verlas cuando puedas, y hay encuentros en vivo para dudas y ejercicios en grupo.',
      'Preciso fazer a trilha inteira?': '¿Tengo que hacer el itinerario completo?',
      'O certificado é reconhecido?': '¿El certificado está reconocido?',
      'Emitimos certificado de curso livre com carga horária e código de validação.':
        'Emitimos un certificado de formación continua con carga horaria y código de validación.',

      'Prefere falar com a gente?': '¿Prefieres hablar con nosotros?',
      'Dúvidas sobre cursos, trilhas ou certificados — escreva e a gente responde.':
        'Dudas sobre cursos, itinerarios o certificados — escríbenos y te respondemos.',
      'e-mail': 'correo',
      '// newsletter': '// boletín',
      'Novas turmas, cursos e conteúdo gratuito de tecnologia. Sem spam.':
        'Nuevos grupos, cursos y contenido gratuito de tecnología. Sin spam.',
      'assinar →': 'suscribirse →',
      'seu e-mail': 'tu correo',
      /* --- menu do faq, portfólio e terminal --- */
      'FAQ': 'FAQ',
      'Tudo o que está dentro das trilhas, curso a curso. Procure pelo nome, filtre por área ou abra um para ver a ementa.': 'Todo lo que hay dentro de los itinerarios, curso a curso. Busca por nombre, filtra por área o abre uno para ver el temario.',
      '… e mais {n} trilhas de carreira': '… y {n} itinerarios de carrera más',
      'precisa antes:': 'antes hace falta:',
      /* --- faq e modal de inscrição --- */
      'Perguntas frequentes': 'Preguntas frecuentes',
      'O que a gente mais ouve — e, marcado, o que ainda está sendo definido.': 'Lo que más nos preguntan — y, señalado, lo que aún se está definiendo.',
      'Posso cancelar quando quiser?': '¿Puedo cancelar cuando quiera?',
      'Sim: a assinatura é mensal e você cancela sozinho, sem falar com ninguém. O acesso continua até o fim do período já pago.': 'Sí: la suscripción es mensual y la cancelas tú mismo, sin hablar con nadie. El acceso sigue hasta el final del período ya pagado.',
      '[resposta de exemplo — a política de cancelamento ainda será definida]': '[respuesta de ejemplo — la política de cancelación aún está por definir]',
      'Quais são as formas de pagamento?': '¿Cuáles son las formas de pago?',
      'Cartão de crédito e Pix, com renovação automática no cartão.': 'Tarjeta de crédito y Pix, con renovación automática en la tarjeta.',
      '[resposta de exemplo — os meios de pagamento ainda serão definidos]': '[respuesta de ejemplo — los medios de pago aún están por definir]',
      'Dá para comprar um curso avulso, sem assinar?': '¿Puedo comprar un curso suelto, sin suscribirme?',
      'Não. O acesso é por assinatura, e ela abre o catálogo conforme o plano.': 'No. El acceso es por suscripción, y ella abre el catálogo según el plan.',
      '[resposta de exemplo — a venda avulsa ainda será decidida]': '[respuesta de ejemplo — la venta suelta aún está por decidir]',
      'Minha empresa pode contratar para a equipe?': '¿Mi empresa puede contratar para el equipo?',
      'Pode: é o plano Equipes, com preço por pessoa e painel de acompanhamento da turma.': 'Sí: es el plan Equipos, con precio por persona y panel de seguimiento del grupo.',
      '[resposta de exemplo — nota fiscal e condições ainda serão definidas]': '[respuesta de ejemplo — la factura y las condiciones aún están por definir]',
      'assinatura.novo': 'suscripcion.nueva',
      'feito no Brasil · para qualquer lugar': 'hecho en Brasil · para cualquier lugar',
    },

    trilhas: {
      frontend: { objetivo:
          'La formación completa de quien construye lo que el usuario ve: de la primera página estática a la aplicación publicada. Secuencia basada en el roadmap público de Front-end de la comunidad roadmap.sh, adaptada a nuestra metodología.',
        nome: 'Desarrollo Front-end', saida: 'Front-end Developer júnior' },
      backend: {
        objetivo:
          'La formación de quien construye lo que sostiene la aplicación: datos, APIs, servidores y escala. Basada en el roadmap público de Back-end de la comunidad roadmap.sh — el lenguaje del servidor lo eliges tú, y el camino vuelve a unirse después.',
        nome: 'Desarrollo Back-end', saida: 'Back-end Developer júnior',
        etapas: { 3: {
          escolha: 'el lenguaje del servidor',
          nota: 'Domina uno bien antes de saltar a otro. El resto del itinerario es igual en cualquier camino.',
          opcoes: ['JavaScript / Node.js', 'Python', 'Java', 'Go'],
        } },
      },
      devops: { objetivo:
          'La formación de quien sostiene la operación: sistemas, redes, nube, automatización y observabilidad. Secuencia basada en el roadmap público de DevOps de la comunidad roadmap.sh. La mitad de los cursos viene de itinerarios anteriores — quien ya hizo Front-end o Back-end entra con medio camino hecho.',
        nome: 'DevOps y SRE', saida: 'DevOps Engineer / SRE júnior' },
      dados: { objetivo:
          'La formación de quien construye la infraestructura que sostiene las decisiones: modelado, pipelines, big data y gobernanza. Secuencia basada en el roadmap público de Data Engineer de la comunidad roadmap.sh, que recomienda Python y SQL como requisitos previos. La mitad de los cursos viene de itinerarios anteriores.',
        nome: 'Ingeniería de Datos', saida: 'Data Engineer júnior' },
      'redes-infra': { objetivo:
          'La formación de quien hace que el paquete llegue: direccionamiento, enrutamiento, wi-fi, seguridad y automatización. Secuencia basada en el roadmap público de Network Engineer de la comunidad roadmap.sh — siete de los once cursos vienen de itinerarios anteriores.',
        nome: 'Redes e Infraestructura', saida: 'Network Engineer júnior' },
      prompt: { objetivo:
          'El itinerario más corto del catálogo y el único que no exige saber programar: quien escribe, atiende, enseña o decide también lo necesita. Cubre entero el roadmap público de Prompt Engineering de la comunidad roadmap.sh, incluido el de AI Red Teaming que referencia.',
        nome: 'Ingeniería de Prompt', saida: 'Especialista en Ingeniería de Prompt' },
      ia: { objetivo:
          'La formación de quien construye productos con IA: elección de modelo, embeddings, RAG, agentes, MCP, evaluación y multimodal. Secuencia basada en el roadmap público de AI Engineer de la comunidad roadmap.sh — la base de programación viene de Python.',
        nome: 'Ingeniería de IA', saida: 'AI Engineer júnior' },
      'arquitetura-software': { objetivo:
          'El único itinerario del catálogo que exige otro antes: es continuación de carrera, no puerta de entrada. Para quien ya desarrolla y va a pasar a decidir — patrones, modelado, integración corporativa, gestión y comunicación. Secuencia basada en el roadmap público de Software Architect de la comunidad roadmap.sh, que pide Back-end como requisito previo.',
        nome: 'Arquitectura de Software', saida: 'Arquitecto(a) de Software' },
      'ti-suporte': { objetivo:
          'La puerta de entrada de la escuela y el primer itinerario que no exige nada: empieza con la torre abierta y termina contigo atendiendo, diagnosticando y documentando. Cubre los bloques Fundamental IT Skills y Operating Systems y la base de red del roadmap público de Cyber Security de la comunidad roadmap.sh.',
        nome: 'Fundamentos de TI y Soporte', saida: 'Técnico(a) de Soporte / Help Desk' },
      seguranca: { objetivo:
          'Ataque y defensa en el mismo camino: fundamentos, criptografía, amenazas, hardening, SOC, test de intrusión y nube. Es la mitad grande del roadmap público de Cyber Security de la comunidad roadmap.sh — la otra mitad se convirtió en el itinerario de Fundamentos de TI y Soporte, que le sirve de base.',
        nome: 'Seguridad Informática', saida: 'Analista de Seguridad de la Información' },
      devsecops: { objetivo:
          'El itinerario más barato del catálogo: está en la intersección de DevOps y Seguridad, y el 80% ya existe. Seguridad que corre en cada commit — código seguro, modelado de amenazas, escaneo en la cadena de montaje, imagen endurecida y cadena de suministro bajo control. Secuencia basada en el roadmap público de DevSecOps de la comunidad roadmap.sh.',
        nome: 'DevSecOps', saida: 'Ingeniero(a) DevSecOps' },
      bi: { objetivo:
          'El itinerario para quien quiere trabajar con datos sin volverse programador: estadística, Excel de verdad, SQL, visualización y la conversación con el negocio. Secuencia basada en el roadmap público de BI Analyst de la comunidad roadmap.sh. Es el itinerario que trajo la estadística que le faltaba a todo el catálogo.',
        nome: 'Business Intelligence', saida: 'Analista de BI / Analista de Datos' },
      qa: { objetivo:
          'La formación de quien garantiza que el software hace lo que promete — y aguanta lo que prometieron por él. Secuencia basada en el roadmap público de QA Engineer de la comunidad roadmap.sh. Como en BI, nadie necesita programar para empezar: son 330h hasta el primer curso de programación, y es la segunda puerta de entrada del catálogo para quien cambia de carrera.',
        nome: 'Calidad y Pruebas de Software', saida: 'QA Engineer júnior' },
      'python-tec': {
        objetivo:
          'Para quien quiere dominar el lenguaje, no un puesto. El tronco es igual para todos — el lenguaje bien aprendido, con control de versiones — y al final eliges dónde aplicarlo: en el servidor, en datos o en IA. Basada en el roadmap público de Python de la comunidad roadmap.sh.',
        nome: 'Python', saida: 'Dominio de Python',
        etapas: { 3: {
          escolha: 'dónde aplicar Python',
          nota: 'Aquí el itinerario no vuelve a unirse: cada camino es una aplicación distinta del mismo lenguaje.',
          opcoes: ['Servidor y APIs', 'Datos', 'IA'],
        } },
      },
      'go-tec': {
        objetivo:
          'El lenguaje en el que se escribieron Docker, Kubernetes y Terraform. El tronco va de la sintaxis a la concurrencia — la parte de Go que no existe en otros lenguajes — y al final eliges el lado: construir servicios o la herramienta que los opera. Basada en el roadmap público de Go de roadmap.sh.',
        nome: 'Go', saida: 'Dominio de Go',
        etapas: { 3: {
          escolha: 'el lado de Go',
          nota: 'Los dos parten de la misma concurrencia: uno construye el servicio, el otro la herramienta que lo opera.',
          opcoes: ['Servicios y APIs', 'Herramientas e Infraestructura'],
        } },
      },
      'sql-tec': {
        objetivo:
          'La tecnología que más emplea y menos exige: SQL se aprende sin saber programar. Es el itinerario de quien viene de administración, contabilidad o gestión y se cansó de pedirle el informe a alguien. Después de la base de datos, eliges qué hacer con el dato. Basada en los roadmaps públicos de SQL y PostgreSQL de la comunidad roadmap.sh.',
        nome: 'SQL y Bases de Datos', saida: 'Dominio de SQL y bases de datos',
        etapas: { 2: {
          escolha: 'qué hacer con el dato',
          nota: 'Los dos caminos parten de la misma base: uno mira a la decisión, el otro al volumen.',
          opcoes: ['Análisis y BI', 'Ingeniería de Datos'],
        } },
      },
    },

    depoimentos: [
      {
        texto: '[Editar: testimonio real de un alumno.] Empecé sin saber qué era HTML y terminé el itinerario con tres proyectos publicados en mi portafolio.',
        autor: '[Nombre del alumno]',
        contexto: 'Itinerario de Desarrollo Front-end · promoción de [año]',
      },
      {
        texto: '[Editar: testimonio real de un alumno.] El curso de Git cambió mi forma de trabajar — hoy colaboro en proyectos sin miedo a romper nada.',
        autor: '[Nombre de la alumna]',
        contexto: 'Git y Control de Versiones · promoción de [año]',
      },
      {
        texto: '[Editar: testimonio real de un alumno.] La parte de IA en el Desarrollo fue lo que más me sorprendió: cambió mi productividad en el trabajo.',
        autor: '[Nombre del alumno]',
        contexto: 'IA en el Desarrollo · promoción de [año]',
      },
    ],

    /* o catálogo vive em assets/i18n-cursos-es.js */
    cursos: {},
  },

  /* =====================================================================
     FRANÇAIS
     "trilha" vira `parcours` — o termo que a formação profissional
     francesa usa para uma sequência de cursos com começo e fim.
     ===================================================================== */
  fr: {
    ui: {
      'Aprenda no seu ritmo,': 'Apprenez à votre rythme,',
      'com': 'avec',
      'Formação em tecnologia organizada em': 'Une formation en technologie organisée en',
      ':\n        você sabe exatamente qual curso fazer primeiro, o que vem depois e\n        onde cada etapa vai te levar. Cursos de base valem para mais de uma\n        carreira — você não estuda a mesma coisa duas vezes.': ' : vous savez exactement quel cours suivre en premier, ce qui vient ensuite et où chaque étape vous mène. Les cours de base comptent pour plusieurs métiers — vous n’étudiez jamais deux fois la même chose.',
      'trilhas ·': 'parcours ·',
      'inscrever --email': 'abonner --email',
      'A cada curso concluído, certificado com código de validação para anexar ao currículo.':
        'Chaque cours terminé donne droit à une attestation avec code de validation à joindre à votre CV.',
      'Deixe seu contato: a gente ajuda a escolher o plano certo e explica as formas de pagamento. Sem compromisso.':
        'Laissez vos coordonnées : nous vous aidons à choisir la bonne formule et expliquons les moyens de paiement. Sans engagement.',
      'Sim — os cursos são práticos e você acompanha fazendo. Um computador simples com internet e um navegador já resolvem.':
        'Oui — les cours sont pratiques et vous avancez en faisant. Un ordinateur simple avec internet et un navigateur suffisent.',
      'As aulas ficam gravadas para você assistir quando puder, e há encontros ao vivo para dúvidas e prática dirigida.':
        'Les cours sont enregistrés pour que vous les regardiez quand vous pouvez, et des rencontres en direct sont prévues pour les questions et la pratique guidée.',
      'Não. A trilha é uma recomendação de ordem — se você só precisa de um curso dela, assista só ele.':
        'Non. Le parcours est un ordre conseillé — si vous n’avez besoin que d’un seul cours, ne regardez que celui-là.',
      'Emitimos certificado de curso livre com carga horária e código de validação, aceito para comprovação de qualificação profissional.':
        'Nous délivrons une attestation de formation continue avec le volume horaire et un code de validation, acceptée comme preuve de qualification professionnelle.',
      'seu nome completo': 'votre nom complet',
      'voce@exemplo.com': 'vous@exemple.com',
      'Ir para a seção 1': 'Aller à la section 1',
      'Ir para a seção 2': 'Aller à la section 2',
      'Ir para a seção 3': 'Aller à la section 3',
      'Ir para a seção 4': 'Aller à la section 4',
      'Ir para a seção 5': 'Aller à la section 5',
      'Ir para a seção 6': 'Aller à la section 6',
      'Ir para a seção 7': 'Aller à la section 7',

      'Comece agora': 'Commencer',
      'Trilhas': 'Parcours',
      'Cursos': 'Cours',
      'Planos': 'Formules',
      'Alunos': 'Élèves',
      'Contato': 'Contact',
      'Área do aluno': 'Espace élève',
      'Escolher idioma': 'Choisir la langue',
      'Mudar para tema claro': 'Passer au thème clair',
      'Abrir menu': 'Ouvrir le menu',
      'codeschool.ing — Cursos e trilhas de programação':
        'codeschool.ing — Cours et parcours de programmation',
      'Escola de tecnologia online: cursos de programação, dados, infraestrutura, segurança e IA organizados em trilhas de formação. Estude no seu ritmo, com professor acompanhando.':
        'École de technologie en ligne : cours de programmation, données, infrastructure, sécurité et IA organisés en parcours de formation. Apprenez à votre rythme, avec un enseignant à vos côtés.',

      'Escola de tecnologia': 'École de technologie',
      'a trilha certa do começo': 'le bon parcours dès le départ',
      'trilhas': 'parcours',
      'Ver as trilhas →': 'Voir les parcours →',
      'Catálogo de cursos': 'Catalogue de cours',
      'cursos': 'cours',
      'trilhas de formação': 'parcours de formation',
      'horas de conteúdo': 'heures de contenu',
      'aluno@codeschool:~': 'eleve@codeschool:~',
      'cursos ·': 'cours ·',

      'por carreira': 'par métier',
      'por tecnologia': 'par technologie',
      'trilhas por carreira': 'parcours par métier',
      'trilhas por tecnologia': 'parcours par technologie',
      'Trilhas anteriores': 'Parcours précédents',
      'Próximas trilhas': 'Parcours suivants',
      'Trilhas por carreira': 'Parcours par métier',
      'Trilhas por tecnologia': 'Parcours par technologie',
      'Escolher trilha': 'Choisir un parcours',
      'Ver níveis anteriores': 'Voir les niveaux précédents',
      'Ver próximos níveis': 'Voir les niveaux suivants',
      'nível': 'niveau',
      'níveis': 'niveaux',
      'chegada': 'arrivée',
      'você escolhe': 'vous choisissez',
      'de carga': 'au total',
      'neste caminho': 'sur ce chemin',
      'a': 'à',
      'deles com ordem livre': 'dont l’ordre est libre',
      'depois de': 'après',
      'em': 'dans',
      'trilha': 'parcours',
      'curso avulso': 'cours indépendant',
      'horas': 'heures',
      'curso': 'cours',

      'Portfólio': 'Portfolio',
      'buscar curso...': 'rechercher un cours...',
      'Buscar curso': 'Rechercher un cours',
      'Filtrar por área': 'Filtrer par domaine',
      'Filtros anteriores': 'Filtres précédents',
      'Próximos filtros': 'Filtres suivants',
      'nenhum curso encontrado — tente outro termo.': 'aucun cours trouvé — essayez un autre terme.',
      'todas': 'tous',
      'fundamentos': 'fondamentaux',
      'programacao': 'programmation',
      'ia': 'ia',
      'frontend': 'frontend',
      'backend': 'backend',
      'dados': 'données',
      'infra': 'infrastructure',
      'arquitetura': 'architecture',
      'gestao': 'gestion',
      'seguranca': 'sécurité',
      'qualidade': 'qualité',
      'iniciante': 'débutant',
      'intermediário': 'intermédiaire',
      'avançado': 'avancé',

      'área': 'domaine',
      'carga': 'volume',
      'o que você aprende': 'ce que vous apprenez',
      'conteúdo detalhado': 'contenu détaillé',
      'tópicos': 'sujets',
      'pré-requisitos': 'prérequis',
      'abre caminho para': 'ouvre la voie vers',
      'vídeo em breve': 'vidéo bientôt',
      'assistir à apresentação do curso': 'regarder la présentation du cours',
      'apresentação do curso': 'présentation du cours',
      'faz parte de {n} trilha de carreira': 'fait partie de {n} parcours métier',
      'faz parte de {n} trilhas de carreira': 'fait partie de {n} parcours métier',
      'faz parte de {n} trilha de tecnologia': 'fait partie de {n} parcours technologique',
      'faz parte de {n} trilhas de tecnologia': 'fait partie de {n} parcours technologiques',
      'e de {n} trilha de tecnologia': 'et de {n} parcours technologique',
      'e de {n} trilhas de tecnologia': 'et de {n} parcours technologiques',
      'Comece agora →': 'Commencer →',
      'Fechar': 'Fermer',

      /* --- planos --- */
      '[planos de exemplo — valores e benefícios ainda a definir]': '[formules d’exemple — tarifs et avantages encore à définir]',
      'Essencial': 'Essentiel',
      'Para quem quer começar por um assunto só.': 'Pour qui veut commencer par un seul sujet.',
      '/mês': '/mois',
      'Uma trilha à sua escolha': 'Un parcours au choix',
      'Aulas gravadas e material de apoio': 'Cours enregistrés et supports',
      'Exercícios com correção automática': 'Exercices avec correction automatique',
      'Certificado a cada curso concluído': 'Un certificat à chaque cours terminé',
      'Quero este plano →': 'Je veux cette formule →',
      'mais escolhido': 'le plus choisi',
      'Completo': 'Complet',
      'Acesso ao catálogo inteiro, sem escolher agora.': 'Accès à tout le catalogue, sans choisir maintenant.',
      'Todas as trilhas e todos os cursos': 'Tous les parcours et tous les cours',
      'Encontros ao vivo para tirar dúvidas': 'Des sessions en direct pour vos questions',
      'Projetos avaliados por um professor': 'Des projets évalués par un enseignant',
      'Equipes': 'Équipes',
      'Para empresas que vão formar mais de uma pessoa.': 'Pour les entreprises qui forment plus d’une personne.',
      '/mês por pessoa': '/mois par personne',
      'Tudo do plano Completo': 'Tout ce que contient la formule Complet',
      'Painel de acompanhamento da turma': 'Un tableau de suivi du groupe',
      'Trilha desenhada com a empresa': 'Un parcours conçu avec l’entreprise',
      'Nota fiscal e pagamento centralizado': 'Facture et paiement centralisé',
      'Falar com a gente →': 'Nous contacter →',
      'Quem passou por aqui': 'Ceux qui sont passés par ici',
      '[depoimentos de exemplo — aguardam os relatos reais]':
        '[témoignages d’exemple — en attente des vrais]',

      'Sua assinatura começa com um oi': 'Votre abonnement commence par un bonjour',
      'nome': 'nom',
      'whatsapp ou e-mail': 'whatsapp ou e-mail',
      'plano': 'formule',
      'ainda não sei — quero orientação': 'je ne sais pas encore — je veux être conseillé',
      'Preciso ter computador em casa?': 'Faut-il avoir un ordinateur chez soi ?',
      'As aulas são ao vivo ou gravadas?': 'Les cours sont-ils en direct ou enregistrés ?',
      'As aulas ficam gravadas para você assistir quando puder, e há encontros ao vivo para dúvidas e exercícios em grupo.':
        'Les cours sont enregistrés pour que vous les regardiez quand vous pouvez, et des rencontres en direct sont prévues pour les questions et les exercices en groupe.',
      'Preciso fazer a trilha inteira?': 'Faut-il suivre le parcours entier ?',
      'O certificado é reconhecido?': 'L’attestation est-elle reconnue ?',
      'Emitimos certificado de curso livre com carga horária e código de validação.':
        'Nous délivrons une attestation de formation continue avec le volume horaire et un code de validation.',

      'Prefere falar com a gente?': 'Vous préférez nous parler ?',
      'Dúvidas sobre cursos, trilhas ou certificados — escreva e a gente responde.':
        'Des questions sur les cours, les parcours ou les certificats — écrivez-nous, nous répondons.',
      'e-mail': 'e-mail',
      '// newsletter': '// newsletter',
      'Novas turmas, cursos e conteúdo gratuito de tecnologia. Sem spam.':
        'Nouveaux groupes, cours et contenus techniques gratuits. Sans spam.',
      'assinar →': 's’abonner →',
      'seu e-mail': 'votre e-mail',
      /* --- menu do faq, portfólio e terminal --- */
      'FAQ': 'FAQ',
      'Tudo o que está dentro das trilhas, curso a curso. Procure pelo nome, filtre por área ou abra um para ver a ementa.': 'Tout ce que contiennent les parcours, cours par cours. Cherchez par nom, filtrez par domaine ou ouvrez-en un pour voir le programme.',
      '… e mais {n} trilhas de carreira': '… et {n} autres parcours métier',
      'precisa antes:': 'à faire avant :',
      /* --- faq e modal de inscrição --- */
      'Perguntas frequentes': 'Questions fréquentes',
      'O que a gente mais ouve — e, marcado, o que ainda está sendo definido.': 'Ce qu’on nous demande le plus — et, signalé, ce qui reste à décider.',
      'Posso cancelar quando quiser?': 'Puis-je résilier quand je veux ?',
      'Sim: a assinatura é mensal e você cancela sozinho, sem falar com ninguém. O acesso continua até o fim do período já pago.': 'Oui : l’abonnement est mensuel et vous le résiliez vous-même, sans parler à personne. L’accès dure jusqu’à la fin de la période déjà payée.',
      '[resposta de exemplo — a política de cancelamento ainda será definida]': '[réponse d’exemple — la politique de résiliation reste à définir]',
      'Quais são as formas de pagamento?': 'Quels sont les moyens de paiement ?',
      'Cartão de crédito e Pix, com renovação automática no cartão.': 'Carte bancaire et Pix, avec renouvellement automatique sur la carte.',
      '[resposta de exemplo — os meios de pagamento ainda serão definidos]': '[réponse d’exemple — les moyens de paiement restent à définir]',
      'Dá para comprar um curso avulso, sem assinar?': 'Peut-on acheter un cours seul, sans s’abonner ?',
      'Não. O acesso é por assinatura, e ela abre o catálogo conforme o plano.': 'Non. L’accès passe par l’abonnement, qui ouvre le catalogue selon la formule.',
      '[resposta de exemplo — a venda avulsa ainda será decidida]': '[réponse d’exemple — la vente à l’unité reste à décider]',
      'Minha empresa pode contratar para a equipe?': 'Mon entreprise peut-elle souscrire pour l’équipe ?',
      'Pode: é o plano Equipes, com preço por pessoa e painel de acompanhamento da turma.': 'Oui : c’est la formule Équipes, au prix par personne et avec un tableau de suivi du groupe.',
      '[resposta de exemplo — nota fiscal e condições ainda serão definidas]': '[réponse d’exemple — la facturation et les conditions restent à définir]',
      'assinatura.novo': 'abonnement.nouveau',
      'feito no Brasil · para qualquer lugar': 'fait au Brésil · pour partout',
    },

    trilhas: {
      frontend: {
        nome: 'Développement Front-end',
        objetivo: 'La formation complète de celui qui construit ce que l’utilisateur voit : de la première page statique à l’application publiée. Séquence fondée sur la feuille de route Front-end publique de la communauté roadmap.sh, adaptée à notre méthode.',
        saida: 'Développeur Front-end junior',
      },
      backend: {
        nome: 'Développement Back-end',
        objetivo: 'La formation de celui qui construit ce qui soutient l’application : données, API, serveurs et montée en charge. Fondée sur la feuille de route Back-end publique de roadmap.sh — le langage du serveur est votre choix, et le chemin se rejoint ensuite.',
        saida: 'Développeur Back-end junior',
        etapas: { 3: {
          escolha: 'le langage du serveur',
          nota: 'Maîtrisez-en un correctement avant d’en essayer un autre. Le reste du parcours est identique quel que soit le chemin.',
          opcoes: ['JavaScript / Node.js', 'Python', 'Java', 'Go'],
        } },
      },
      devops: {
        nome: 'DevOps et SRE',
        objetivo: 'La formation de celui qui fait tourner l’exploitation : systèmes, réseaux, cloud, automatisation et observabilité. Séquence fondée sur la feuille de route DevOps publique de roadmap.sh. La moitié des cours vient des parcours précédents — qui a fait Front-end ou Back-end démarre à mi-chemin.',
        saida: 'Ingénieur DevOps / SRE junior',
      },
      dados: {
        nome: 'Ingénierie des Données',
        objetivo: 'La formation de celui qui construit l’infrastructure des décisions : modélisation, pipelines, big data et gouvernance. Séquence fondée sur la feuille de route Data Engineer publique de roadmap.sh, qui recommande Python et SQL comme prérequis. La moitié des cours vient des parcours précédents.',
        saida: 'Ingénieur Données junior',
      },
      'redes-infra': {
        nome: 'Réseaux et Infrastructure',
        objetivo: 'La formation de celui qui fait arriver le paquet : adressage, routage, wi-fi, sécurité et automatisation. Séquence fondée sur la feuille de route Network Engineer publique de roadmap.sh — sept des onze cours viennent des parcours précédents.',
        saida: 'Ingénieur Réseaux junior',
      },
      prompt: {
        nome: 'Ingénierie de Prompt',
        objetivo: 'Le parcours le plus court du catalogue et le seul qui n’exige pas de savoir programmer : qui écrit, conseille, enseigne ou décide en a besoin aussi. Il couvre entièrement la feuille de route Prompt Engineering publique de roadmap.sh, y compris celle d’AI Red Teaming qu’elle référence.',
        saida: 'Spécialiste en ingénierie de prompt',
      },
      ia: {
        nome: 'Ingénierie de l’IA',
        objetivo: 'La formation de celui qui construit des produits avec l’IA : choix du modèle, embeddings, RAG, agents, MCP, évaluation et multimodal. Séquence fondée sur la feuille de route AI Engineer publique de roadmap.sh — la base de programmation vient de Python.',
        saida: 'Ingénieur IA junior',
      },
      'arquitetura-software': {
        nome: 'Architecture Logicielle',
        objetivo: 'Le seul parcours du catalogue qui en exige un autre avant : c’est une suite de carrière, pas une porte d’entrée. Pour qui développe déjà et va se mettre à décider — patrons, modélisation, intégration en entreprise, gestion et communication. Séquence fondée sur la feuille de route Software Architect publique de roadmap.sh, qui demande le Back-end comme prérequis.',
        saida: 'Architecte logiciel',
      },
      'ti-suporte': {
        nome: 'Fondamentaux de l’Informatique et Support',
        objetivo: 'La porte d’entrée de l’école et le premier parcours qui n’exige rien : il commence par le boîtier ouvert et se termine avec vous en train d’assister, de diagnostiquer et de documenter. Il couvre les blocs Fundamental IT Skills, Operating Systems et la base réseau de la feuille de route Cyber Security publique de roadmap.sh.',
        saida: 'Technicien support / Help Desk',
      },
      seguranca: {
        nome: 'Cybersécurité',
        objetivo: 'Attaque et défense sur le même chemin : fondamentaux, cryptographie, menaces, durcissement, SOC, test d’intrusion et cloud. C’est la grande moitié de la feuille de route Cyber Security publique de roadmap.sh — l’autre moitié est devenue le parcours Fondamentaux de l’Informatique, qui sert de base à celui-ci.',
        saida: 'Analyste en sécurité de l’information',
      },
      devsecops: {
        nome: 'DevSecOps',
        objetivo: 'Le parcours le moins coûteux du catalogue : il se situe à l’intersection de DevOps et de la Sécurité, et 80 % existe déjà. De la sécurité qui tourne à chaque commit — code sûr, modélisation des menaces, analyse dans la chaîne, image durcie et chaîne d’approvisionnement sous contrôle. Séquence fondée sur la feuille de route DevSecOps publique de roadmap.sh.',
        saida: 'Ingénieur DevSecOps',
      },
      bi: {
        nome: 'Business Intelligence',
        objetivo: 'Le parcours pour qui veut travailler avec les données sans devenir développeur : statistiques, Excel pour de vrai, SQL, visualisation et la conversation avec le métier. Séquence fondée sur la feuille de route BI Analyst publique de roadmap.sh. C’est le parcours qui apporte les statistiques qui manquaient à tout le catalogue.',
        saida: 'Analyste BI / Analyste de données',
      },
      qa: {
        nome: 'Qualité et Tests Logiciels',
        objetivo: 'La formation de celui qui garantit que le logiciel fait ce qu’il promet — et tient ce qu’on a promis pour lui. Séquence fondée sur la feuille de route QA Engineer publique de roadmap.sh. Comme en BI, nul besoin de programmer pour commencer : 330 h séparent du premier cours de programmation, et c’est la deuxième porte d’entrée du catalogue pour qui change de métier.',
        saida: 'Ingénieur QA junior',
      },
      'python-tec': {
        nome: 'Python',
        objetivo: 'Pour qui veut maîtriser le langage, pas un poste. Le tronc est le même pour tous — le langage bien appris, avec la gestion de versions — et à la fin vous choisissez où l’appliquer : au serveur, aux données ou à l’IA. Fondé sur la feuille de route Python publique de roadmap.sh.',
        saida: 'Maîtrise de Python',
        etapas: { 3: {
          escolha: 'où appliquer Python',
          nota: 'Ici le parcours ne se rejoint plus : chaque chemin est une application différente du même langage.',
          opcoes: ['Serveur et API', 'Données', 'IA'],
        } },
      },
      'go-tec': {
        nome: 'Go',
        objetivo: 'Le langage dans lequel Docker, Kubernetes et Terraform ont été écrits. Le tronc va de la syntaxe à la concurrence — la partie de Go qui n’existe pas ailleurs — et à la fin vous choisissez votre camp : construire des services ou l’outil d’infrastructure. Fondé sur la feuille de route Go publique de roadmap.sh.',
        saida: 'Maîtrise de Go',
        etapas: { 3: {
          escolha: 'le camp de Go',
          nota: 'Les deux partent de la même concurrence : l’un construit le service, l’autre construit l’outil qui exploite le service.',
          opcoes: ['Services et API', 'Outils et Infrastructure'],
        } },
      },
      'sql-tec': {
        nome: 'SQL et Bases de Données',
        objetivo: 'La technologie qui emploie le plus et exige le moins : SQL s’apprend sans savoir programmer. C’est le parcours de qui vient de l’administratif, de la comptabilité ou de la gestion et en a assez de demander un rapport à quelqu’un. Après la base, vous choisissez quoi faire de la donnée. Fondé sur les feuilles de route SQL et PostgreSQL publiques de roadmap.sh.',
        saida: 'Maîtrise de SQL et des bases de données',
        etapas: { 2: {
          escolha: 'quoi faire de la donnée',
          nota: 'Les deux chemins partent de la même base : l’un regarde la décision, l’autre le volume.',
          opcoes: ['Analyse et BI', 'Ingénierie des Données'],
        } },
      },
    },

    depoimentos: [
      {
        texto: '[À modifier : témoignage réel d’un élève.] J’ai commencé sans savoir ce qu’était le HTML et j’ai terminé le parcours avec trois projets publiés dans mon portfolio.',
        autor: '[Nom de l’élève]',
        contexto: 'Parcours Développement Front-end · promotion [année]',
      },
      {
        texto: '[À modifier : témoignage réel d’un élève.] Le cours de Git a changé ma façon de travailler — aujourd’hui je collabore sans craindre de tout casser.',
        autor: '[Nom de l’élève]',
        contexto: 'Git et Contrôle de Versions · promotion [année]',
      },
      {
        texto: '[À modifier : témoignage réel d’un élève.] La partie IA dans le Développement m’a le plus surpris : elle a changé ma productivité au travail.',
        autor: '[Nom de l’élève]',
        contexto: 'IA dans le Développement · promotion [année]',
      },
    ],

    /* o catálogo vive em assets/i18n-cursos-fr.js */
    cursos: {},
  },

  /* =====================================================================
     ITALIANO
     "trilha" vira `percorso`, o termo corrente da formação profissional.
     ===================================================================== */
  it: {
    ui: {
      'Aprenda no seu ritmo,': 'Impara al tuo ritmo,',
      'com': 'con',
      'Formação em tecnologia organizada em': 'Formazione tecnologica organizzata in',
      ':\n        você sabe exatamente qual curso fazer primeiro, o que vem depois e\n        onde cada etapa vai te levar. Cursos de base valem para mais de uma\n        carreira — você não estuda a mesma coisa duas vezes.': ': sai esattamente quale corso fare per primo, cosa viene dopo e dove ti porta ogni tappa. I corsi di base valgono per più di una carriera — non studi mai due volte la stessa cosa.',
      'trilhas ·': 'percorsi ·',
      'inscrever --email': 'iscrivi --email',
      'A cada curso concluído, certificado com código de validação para anexar ao currículo.':
        'Ogni corso concluso dà diritto a un attestato con codice di validazione da allegare al curriculum.',
      'Deixe seu contato: a gente ajuda a escolher o plano certo e explica as formas de pagamento. Sem compromisso.':
        'Lasciaci il tuo contatto: ti aiutiamo a scegliere il piano giusto e ti spieghiamo i metodi di pagamento. Senza impegno.',
      'Sim — os cursos são práticos e você acompanha fazendo. Um computador simples com internet e um navegador já resolvem.':
        'Sì — i corsi sono pratici e avanzi facendo. Un computer semplice con internet e un browser bastano.',
      'As aulas ficam gravadas para você assistir quando puder, e há encontros ao vivo para dúvidas e prática dirigida.':
        'Le lezioni restano registrate per guardarle quando puoi, e ci sono incontri dal vivo per domande e pratica guidata.',
      'Não. A trilha é uma recomendação de ordem — se você só precisa de um curso dela, assista só ele.':
        'No. Il percorso è un ordine consigliato — se ti serve un solo corso, guarda solo quello.',
      'Emitimos certificado de curso livre com carga horária e código de validação, aceito para comprovação de qualificação profissional.':
        'Rilasciamo un attestato di formazione con monte ore e codice di validazione, accettato come prova di qualifica professionale.',
      'seu nome completo': 'il tuo nome completo',
      'voce@exemplo.com': 'tu@esempio.com',
      'Ir para a seção 1': 'Vai alla sezione 1',
      'Ir para a seção 2': 'Vai alla sezione 2',
      'Ir para a seção 3': 'Vai alla sezione 3',
      'Ir para a seção 4': 'Vai alla sezione 4',
      'Ir para a seção 5': 'Vai alla sezione 5',
      'Ir para a seção 6': 'Vai alla sezione 6',
      'Ir para a seção 7': 'Vai alla sezione 7',

      'Comece agora': 'Inizia ora',
      'Trilhas': 'Percorsi',
      'Cursos': 'Corsi',
      'Planos': 'Piani',
      'Alunos': 'Studenti',
      'Contato': 'Contatti',
      'Área do aluno': 'Area studenti',
      'Escolher idioma': 'Scegli la lingua',
      'Mudar para tema claro': 'Passa al tema chiaro',
      'Abrir menu': 'Apri il menu',
      'codeschool.ing — Cursos e trilhas de programação':
        'codeschool.ing — Corsi e percorsi di programmazione',
      'Escola de tecnologia online: cursos de programação, dados, infraestrutura, segurança e IA organizados em trilhas de formação. Estude no seu ritmo, com professor acompanhando.':
        'Scuola di tecnologia online: corsi di programmazione, dati, infrastruttura, sicurezza e IA organizzati in percorsi di formazione. Studia al tuo ritmo, con un docente al tuo fianco.',

      'Escola de tecnologia': 'Scuola di tecnologia',
      'a trilha certa do começo': 'il percorso giusto fin dall’inizio',
      'trilhas': 'percorsi',
      'Ver as trilhas →': 'Vedi i percorsi →',
      'Catálogo de cursos': 'Catalogo dei corsi',
      'cursos': 'corsi',
      'trilhas de formação': 'percorsi di formazione',
      'horas de conteúdo': 'ore di contenuto',
      'aluno@codeschool:~': 'studente@codeschool:~',
      'cursos ·': 'corsi ·',

      'por carreira': 'per carriera',
      'por tecnologia': 'per tecnologia',
      'trilhas por carreira': 'percorsi per carriera',
      'trilhas por tecnologia': 'percorsi per tecnologia',
      'Trilhas anteriores': 'Percorsi precedenti',
      'Próximas trilhas': 'Percorsi successivi',
      'Trilhas por carreira': 'Percorsi per carriera',
      'Trilhas por tecnologia': 'Percorsi per tecnologia',
      'Escolher trilha': 'Scegli un percorso',
      'Ver níveis anteriores': 'Vedi i livelli precedenti',
      'Ver próximos níveis': 'Vedi i livelli successivi',
      'nível': 'livello',
      'níveis': 'livelli',
      'chegada': 'arrivo',
      'você escolhe': 'scegli tu',
      'de carga': 'in totale',
      'neste caminho': 'su questo percorso',
      'a': 'a',
      'deles com ordem livre': 'di questi in ordine libero',
      'depois de': 'dopo',
      'em': 'in',
      'trilha': 'percorso',
      'curso avulso': 'corso singolo',
      'horas': 'ore',
      'curso': 'corso',

      'Portfólio': 'Portfolio',
      'buscar curso...': 'cerca un corso...',
      'Buscar curso': 'Cerca un corso',
      'Filtrar por área': 'Filtra per area',
      'Filtros anteriores': 'Filtri precedenti',
      'Próximos filtros': 'Filtri successivi',
      'nenhum curso encontrado — tente outro termo.': 'nessun corso trovato — prova un altro termine.',
      'todas': 'tutti',
      'fundamentos': 'fondamenti',
      'programacao': 'programmazione',
      'ia': 'ia',
      'frontend': 'frontend',
      'backend': 'backend',
      'dados': 'dati',
      'infra': 'infrastruttura',
      'arquitetura': 'architettura',
      'gestao': 'gestione',
      'seguranca': 'sicurezza',
      'qualidade': 'qualità',
      'iniciante': 'principiante',
      'intermediário': 'intermedio',
      'avançado': 'avanzato',

      'área': 'area',
      'carga': 'monte ore',
      'o que você aprende': 'cosa impari',
      'conteúdo detalhado': 'contenuto dettagliato',
      'tópicos': 'argomenti',
      'pré-requisitos': 'prerequisiti',
      'abre caminho para': 'apre la strada a',
      'vídeo em breve': 'video in arrivo',
      'assistir à apresentação do curso': 'guarda la presentazione del corso',
      'apresentação do curso': 'presentazione del corso',
      'faz parte de {n} trilha de carreira': 'fa parte di {n} percorso di carriera',
      'faz parte de {n} trilhas de carreira': 'fa parte di {n} percorsi di carriera',
      'faz parte de {n} trilha de tecnologia': 'fa parte di {n} percorso tecnologico',
      'faz parte de {n} trilhas de tecnologia': 'fa parte di {n} percorsi tecnologici',
      'e de {n} trilha de tecnologia': 'e di {n} percorso tecnologico',
      'e de {n} trilhas de tecnologia': 'e di {n} percorsi tecnologici',
      'Comece agora →': 'Inizia ora →',
      'Fechar': 'Chiudi',

      /* --- planos --- */
      '[planos de exemplo — valores e benefícios ainda a definir]': '[piani di esempio — prezzi e vantaggi ancora da definire]',
      'Essencial': 'Essenziale',
      'Para quem quer começar por um assunto só.': 'Per chi vuole iniziare da un solo argomento.',
      '/mês': '/mese',
      'Uma trilha à sua escolha': 'Un percorso a tua scelta',
      'Aulas gravadas e material de apoio': 'Lezioni registrate e materiale di supporto',
      'Exercícios com correção automática': 'Esercizi con correzione automatica',
      'Certificado a cada curso concluído': 'Certificato per ogni corso completato',
      'Quero este plano →': 'Voglio questo piano →',
      'mais escolhido': 'il più scelto',
      'Completo': 'Completo',
      'Acesso ao catálogo inteiro, sem escolher agora.': 'Accesso a tutto il catalogo, senza scegliere ora.',
      'Todas as trilhas e todos os cursos': 'Tutti i percorsi e tutti i corsi',
      'Encontros ao vivo para tirar dúvidas': 'Incontri dal vivo per le domande',
      'Projetos avaliados por um professor': 'Progetti valutati da un docente',
      'Equipes': 'Team',
      'Para empresas que vão formar mais de uma pessoa.': 'Per aziende che formano più di una persona.',
      '/mês por pessoa': '/mese a persona',
      'Tudo do plano Completo': 'Tutto del piano Completo',
      'Painel de acompanhamento da turma': 'Un pannello per seguire il gruppo',
      'Trilha desenhada com a empresa': 'Un percorso progettato con l’azienda',
      'Nota fiscal e pagamento centralizado': 'Fattura e pagamento centralizzato',
      'Falar com a gente →': 'Parliamone →',
      'Quem passou por aqui': 'Chi è passato di qui',
      '[depoimentos de exemplo — aguardam os relatos reais]':
        '[testimonianze di esempio — in attesa di quelle vere]',

      'Sua assinatura começa com um oi': 'Il tuo abbonamento inizia con un ciao',
      'nome': 'nome',
      'whatsapp ou e-mail': 'whatsapp o e-mail',
      'plano': 'piano',
      'ainda não sei — quero orientação': 'non lo so ancora — voglio un consiglio',
      'Preciso ter computador em casa?': 'Serve avere un computer a casa?',
      'As aulas são ao vivo ou gravadas?': 'Le lezioni sono dal vivo o registrate?',
      'As aulas ficam gravadas para você assistir quando puder, e há encontros ao vivo para dúvidas e exercícios em grupo.':
        'Le lezioni restano registrate per guardarle quando puoi, e ci sono incontri dal vivo per domande ed esercizi di gruppo.',
      'Preciso fazer a trilha inteira?': 'Devo fare tutto il percorso?',
      'O certificado é reconhecido?': 'L’attestato è riconosciuto?',
      'Emitimos certificado de curso livre com carga horária e código de validação.':
        'Rilasciamo un attestato di formazione con monte ore e codice di validazione.',

      'Prefere falar com a gente?': 'Preferisci parlare con noi?',
      'Dúvidas sobre cursos, trilhas ou certificados — escreva e a gente responde.':
        'Domande su corsi, percorsi o certificati — scrivici e ti rispondiamo.',
      'e-mail': 'e-mail',
      '// newsletter': '// newsletter',
      'Novas turmas, cursos e conteúdo gratuito de tecnologia. Sem spam.':
        'Nuove classi, corsi e contenuti tecnici gratuiti. Niente spam.',
      'assinar →': 'iscriviti →',
      'seu e-mail': 'la tua e-mail',
      /* --- menu do faq, portfólio e terminal --- */
      'FAQ': 'FAQ',
      'Tudo o que está dentro das trilhas, curso a curso. Procure pelo nome, filtre por área ou abra um para ver a ementa.': 'Tutto quello che c’è dentro i percorsi, corso per corso. Cerca per nome, filtra per area o aprine uno per vedere il programma.',
      '… e mais {n} trilhas de carreira': '… e altri {n} percorsi di carriera',
      'precisa antes:': 'prima serve:',
      /* --- faq e modal de inscrição --- */
      'Perguntas frequentes': 'Domande frequenti',
      'O que a gente mais ouve — e, marcado, o que ainda está sendo definido.': 'Quello che ci chiedono di più — e, segnalato, quello che resta da definire.',
      'Posso cancelar quando quiser?': 'Posso disdire quando voglio?',
      'Sim: a assinatura é mensal e você cancela sozinho, sem falar com ninguém. O acesso continua até o fim do período já pago.': 'Sì: l’abbonamento è mensile e lo disdici da solo, senza parlare con nessuno. L’accesso resta fino alla fine del periodo già pagato.',
      '[resposta de exemplo — a política de cancelamento ainda será definida]': '[risposta di esempio — la politica di disdetta è ancora da definire]',
      'Quais são as formas de pagamento?': 'Quali sono i metodi di pagamento?',
      'Cartão de crédito e Pix, com renovação automática no cartão.': 'Carta di credito e Pix, con rinnovo automatico sulla carta.',
      '[resposta de exemplo — os meios de pagamento ainda serão definidos]': '[risposta di esempio — i metodi di pagamento sono ancora da definire]',
      'Dá para comprar um curso avulso, sem assinar?': 'Posso comprare un singolo corso, senza abbonarmi?',
      'Não. O acesso é por assinatura, e ela abre o catálogo conforme o plano.': 'No. L’accesso è tramite abbonamento, che apre il catalogo secondo il piano.',
      '[resposta de exemplo — a venda avulsa ainda será decidida]': '[risposta di esempio — la vendita singola è ancora da decidere]',
      'Minha empresa pode contratar para a equipe?': 'La mia azienda può abbonarsi per il team?',
      'Pode: é o plano Equipes, com preço por pessoa e painel de acompanhamento da turma.': 'Sì: è il piano Team, con prezzo a persona e un pannello per seguire il gruppo.',
      '[resposta de exemplo — nota fiscal e condições ainda serão definidas]': '[risposta di esempio — fattura e condizioni sono ancora da definire]',
      'assinatura.novo': 'abbonamento.nuovo',
      'feito no Brasil · para qualquer lugar': 'fatto in Brasile · per ovunque',
    },

    trilhas: {
      frontend: {
        nome: 'Sviluppo Front-end',
        objetivo: 'La formazione completa di chi costruisce ciò che l’utente vede: dalla prima pagina statica all’applicazione pubblicata. Sequenza basata sulla roadmap pubblica Front-end della comunità roadmap.sh, adattata al nostro metodo.',
        saida: 'Sviluppatore Front-end junior',
      },
      backend: {
        nome: 'Sviluppo Back-end',
        objetivo: 'La formazione di chi costruisce ciò che regge l’applicazione: dati, API, server e scalabilità. Basata sulla roadmap pubblica Back-end di roadmap.sh — il linguaggio del server lo scegli tu, e poi il percorso torna a unirsi.',
        saida: 'Sviluppatore Back-end junior',
        etapas: { 3: {
          escolha: 'il linguaggio del server',
          nota: 'Impara bene uno prima di passare a un altro. Il resto del percorso è identico su qualsiasi strada.',
          opcoes: ['JavaScript / Node.js', 'Python', 'Java', 'Go'],
        } },
      },
      devops: {
        nome: 'DevOps e SRE',
        objetivo: 'La formazione di chi tiene in piedi l’esercizio: sistemi, reti, cloud, automazione e osservabilità. Sequenza basata sulla roadmap pubblica DevOps di roadmap.sh. Metà dei corsi viene dai percorsi precedenti — chi ha fatto Front-end o Back-end parte già a metà strada.',
        saida: 'Ingegnere DevOps / SRE junior',
      },
      dados: {
        nome: 'Ingegneria dei Dati',
        objetivo: 'La formazione di chi costruisce l’infrastruttura che sostiene le decisioni: modellazione, pipeline, big data e governance. Sequenza basata sulla roadmap pubblica Data Engineer di roadmap.sh, che raccomanda Python e SQL come prerequisiti. Metà dei corsi viene dai percorsi precedenti.',
        saida: 'Ingegnere dei Dati junior',
      },
      'redes-infra': {
        nome: 'Reti e Infrastruttura',
        objetivo: 'La formazione di chi fa arrivare il pacchetto: indirizzamento, instradamento, wi-fi, sicurezza e automazione. Sequenza basata sulla roadmap pubblica Network Engineer di roadmap.sh — sette degli undici corsi vengono dai percorsi precedenti.',
        saida: 'Ingegnere di Rete junior',
      },
      prompt: {
        nome: 'Ingegneria del Prompt',
        objetivo: 'Il percorso più breve del catalogo e l’unico che non richiede di saper programmare: serve anche a chi scrive, assiste, insegna o decide. Copre per intero la roadmap pubblica Prompt Engineering di roadmap.sh, inclusa quella di AI Red Teaming a cui rimanda.',
        saida: 'Specialista in ingegneria del prompt',
      },
      ia: {
        nome: 'Ingegneria dell’IA',
        objetivo: 'La formazione di chi costruisce prodotti con l’IA: scelta del modello, embedding, RAG, agenti, MCP, valutazione e multimodale. Sequenza basata sulla roadmap pubblica AI Engineer di roadmap.sh — la base di programmazione viene da Python.',
        saida: 'Ingegnere IA junior',
      },
      'arquitetura-software': {
        nome: 'Architettura del Software',
        objetivo: 'L’unico percorso del catalogo che ne richiede un altro prima: è un seguito di carriera, non una porta d’ingresso. Per chi già sviluppa e passerà a decidere — pattern, modellazione, integrazione aziendale, gestione e comunicazione. Sequenza basata sulla roadmap pubblica Software Architect di roadmap.sh, che chiede il Back-end come prerequisito.',
        saida: 'Architetto del software',
      },
      'ti-suporte': {
        nome: 'Fondamenti di Informatica e Supporto',
        objetivo: 'La porta d’ingresso della scuola e il primo percorso che non richiede nulla: inizia dal case aperto e finisce con te che assisti, diagnostichi e documenti. Copre i blocchi Fundamental IT Skills, Operating Systems e la base di rete della roadmap pubblica Cyber Security di roadmap.sh.',
        saida: 'Tecnico di supporto / Help Desk',
      },
      seguranca: {
        nome: 'Sicurezza Informatica',
        objetivo: 'Attacco e difesa sullo stesso cammino: fondamenti, crittografia, minacce, hardening, SOC, penetration test e cloud. È la metà grande della roadmap pubblica Cyber Security di roadmap.sh — l’altra metà è diventata il percorso Fondamenti di Informatica, che fa da base a questo.',
        saida: 'Analista di sicurezza informatica',
      },
      devsecops: {
        nome: 'DevSecOps',
        objetivo: 'Il percorso più economico del catalogo: sta all’incrocio tra DevOps e Sicurezza, e l’80% esiste già. Sicurezza che gira a ogni commit — codice sicuro, modellazione delle minacce, scansione nella pipeline, immagine irrobustita e catena di fornitura sotto controllo. Sequenza basata sulla roadmap pubblica DevSecOps di roadmap.sh.',
        saida: 'Ingegnere DevSecOps',
      },
      bi: {
        nome: 'Business Intelligence',
        objetivo: 'Il percorso per chi vuole lavorare con i dati senza diventare programmatore: statistica, Excel per davvero, SQL, visualizzazione e il dialogo con il business. Sequenza basata sulla roadmap pubblica BI Analyst di roadmap.sh. È il percorso che porta la statistica che mancava a tutto il catalogo.',
        saida: 'Analista BI / Analista dei dati',
      },
      qa: {
        nome: 'Qualità e Test del Software',
        objetivo: 'La formazione di chi garantisce che il software faccia ciò che promette — e regga ciò che è stato promesso al posto suo. Sequenza basata sulla roadmap pubblica QA Engineer di roadmap.sh. Come in BI, non serve programmare per iniziare: ci sono 330 ore prima del primo corso di programmazione, ed è la seconda porta d’ingresso del catalogo per chi cambia carriera.',
        saida: 'Ingegnere QA junior',
      },
      'python-tec': {
        nome: 'Python',
        objetivo: 'Per chi vuole padroneggiare il linguaggio, non un ruolo. Il tronco è uguale per tutti — il linguaggio imparato bene, con il versionamento — e alla fine scegli dove applicarlo: al server, ai dati o all’IA. Basato sulla roadmap pubblica Python di roadmap.sh.',
        saida: 'Padronanza di Python',
        etapas: { 3: {
          escolha: 'dove applicare Python',
          nota: 'Qui il percorso non torna a unirsi: ogni strada è un’applicazione diversa dello stesso linguaggio.',
          opcoes: ['Server e API', 'Dati', 'IA'],
        } },
      },
      'go-tec': {
        nome: 'Go',
        objetivo: 'Il linguaggio in cui sono scritti Docker, Kubernetes e Terraform. Il tronco va dalla sintassi alla concorrenza — la parte di Go che non esiste altrove — e alla fine scegli il lato: costruire servizi o lo strumento di infrastruttura. Basato sulla roadmap pubblica Go di roadmap.sh.',
        saida: 'Padronanza di Go',
        etapas: { 3: {
          escolha: 'il lato di Go',
          nota: 'I due partono dalla stessa concorrenza: uno costruisce il servizio, l’altro costruisce lo strumento che lo gestisce.',
          opcoes: ['Servizi e API', 'Strumenti e Infrastruttura'],
        } },
      },
      'sql-tec': {
        nome: 'SQL e Basi di Dati',
        objetivo: 'La tecnologia che impiega di più e richiede di meno: SQL si impara senza saper programmare. È il percorso di chi viene dall’amministrazione, dalla contabilità o dalla gestione ed è stanco di chiedere un report a qualcun altro. Dopo la base di dati, scegli cosa farne del dato. Basato sulle roadmap pubbliche SQL e PostgreSQL di roadmap.sh.',
        saida: 'Padronanza di SQL e basi di dati',
        etapas: { 2: {
          escolha: 'cosa fare del dato',
          nota: 'Le due strade partono dalla stessa base: una guarda alla decisione, l’altra al volume.',
          opcoes: ['Analisi e BI', 'Ingegneria dei Dati'],
        } },
      },
    },

    depoimentos: [
      {
        texto: '[Da sostituire: testimonianza reale di uno studente.] Ho iniziato senza sapere cosa fosse l’HTML e ho finito il percorso con tre progetti pubblicati nel mio portfolio.',
        autor: '[Nome dello studente]',
        contexto: 'Percorso Sviluppo Front-end · classe [anno]',
      },
      {
        texto: '[Da sostituire: testimonianza reale di uno studente.] Il corso di Git ha cambiato il mio modo di lavorare — oggi collaboro ai progetti senza paura di rompere nulla.',
        autor: '[Nome dello studente]',
        contexto: 'Git e Controllo di Versione · classe [anno]',
      },
      {
        texto: '[Da sostituire: testimonianza reale di uno studente.] La parte di IA nello Sviluppo è quella che mi ha sorpreso di più: ha cambiato la mia produttività al lavoro.',
        autor: '[Nome dello studente]',
        contexto: 'IA nello Sviluppo · classe [anno]',
      },
    ],

    /* o catálogo vive em assets/i18n-cursos-it.js */
    cursos: {},
  },
};
