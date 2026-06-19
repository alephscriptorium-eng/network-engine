---
scene_id: s01-06
session: sesion-01-ruptura-economia-hiperipl
source_file: raw/log-agent-1.md
source_lines: [495, 675]
layer: output
tags: [cota:sima, ruptura, discrepancia, eigenstate, HiperIPL, DAO, IPL, hiperplaza]
---
Nota de exordio y solicitud
---------------------------
> Estimado profesor,
>
> A lo largo de este debate hemos recorrido un camino que va de la crítica de Rallo a la teoría del valor de Marx, de la modernidad jacobina abortada a la capa teológica del logos cristiano, y de allí a la hiperplaza digital construida con herramientas FOSS, Ethereum y DAOs. Usted señaló con justicia que la Modernidad de la virtud cívica fue derribada del nido antes de volar. Yo me pregunto si parte de sus alas no están hoy dispersas en los repositorios y los protocolos de consenso que, a pesar de su aparente frialdad técnica, encarnan una nueva forma de asamblea.
>
> De esa conjetura nace el proyecto que someto a su consideración. No es una disertación abstracta, sino un artefacto: una *hiperextensión de la Iniciativa Popular Legislativa (IPL)* que utiliza una DAO para recoger, formalizar y dar seguimiento a la voluntad del electorado o de los trabajadores, resolviendo los dos grandes males de la IPL analógica ---reunir firmas y evitar su eterna desestimación--- y ofreciendo además un equivalente sindical que equipara la voz de los trabajadores a la de la directiva.
>
> Le ruego que acepte este informe ejecutivo como propuesta de trabajo académico y, si lo estima oportuno, como objeto de tutorías para su planificación, diseño de producto e incluso especificación técnica. Lo presento como un artefacto final que condensa el vocabulario, el directorio y las tesis debatidas en el curso, y que aspira a ser algo más que un ejercicio: un prototipo de hiperplaza para una *res publica* de la voz.
>
> Quedo a la espera de su veredicto, para bien o para enmienda.
* * * * *
Informe ejecutivo: HiperIPL -- Una hiperplaza para la voz legislativa y sindical
===============================================================================
1\. Introducción
----------------
La Iniciativa Popular Legislativa (IPL) es, en el papel, un mecanismo de democracia directa que permite a la ciudadanía presentar proposiciones de ley ante el parlamento. En el ámbito laboral, los trabajadores carecen de un instrumento análogo que formalice su voz colectiva ante la dirección de la empresa con fuerza vinculante equiparable. Ambos espacios comparten dos problemas: (a) la dificultad de reunir las firmas necesarias y verificar su autenticidad sin costes desproporcionados, y (b) la falta de trazabilidad y seguimiento una vez presentada la iniciativa, que suele ser desestimada, archivada o eternizada en trámites.
El proyecto HiperIPL propone una solución basada en la "hiperplaza", concepto surgido del debate anterior: una infraestructura digital FOSS que funciona como plaza pública persistente, auditable y sin autoridad central única. Utilizando una DAO (Organización Autónoma Descentralizada), el sistema recoge firmas, las hace verificables criptográficamente, y mantiene viva la voz de los firmantes más allá del momento de la entrega.
2\. Objetivo: la hiperplaza como orquestador de "voz"
-----------------------------------------------------
La hiperplaza no es solo un buzón de firmas; es un espacio donde la opinión pública o la voluntad de los trabajadores se cristaliza, se formaliza y se defiende de forma continua ante los poderes gubernamentales o la patronal. Se busca que cada IPL o reclamación sindical sea un "contrato inteligente de voz": una entidad viva que evoluciona, acumula apoyos, notifica hitos y, en caso de rechazo o inacción, escala automáticamente a nuevas instancias o convoca movilizaciones.
La hipótesis es que una DAO de este tipo puede superar la anemia de la IPL analógica (papel, mesas, registros administrativos) y, en el ámbito sindical, equiparar la capacidad de propuesta de los trabajadores a la de la directiva, forzando negociación sobre un texto articulado y auditado por la red.
3\. Principios rectores extraídos del debate y del directorio FOSS
------------------------------------------------------------------
-   **Auditabilidad total:** Todo el código y todas las firmas son públicas y verificables (heredado de Git, GPG).
-   **Descentralización sin papa:** No hay una sola autoridad que pueda archivar la iniciativa; la gobernanza sigue modelos ortodoxos (autocefalía de las cámaras) o protestantes (derecho a fork).
-   **Soberanía de la identidad:** Cada ciudadano o trabajador genera su par de claves (GPG) y controla su firma. Sin burocracia central.
-   **Inmutabilidad del rastro:** La cadena de bloques (Ethereum o una sidechain) registra cada apoyo, cada modificación del texto y cada respuesta institucional.
-   **Caridad algorítmica limitada:** La máquina no sustituye la virtud, pero impide que la palabra dada se disuelva en el cajón de un funcionario.
4\. Diseño de la DAO
--------------------
### 4.1. Núcleo común (Core)
Una DAO base, desplegada en Ethereum o en una L2 de bajo coste, con los siguientes módulos:
1.  **Registro de identidad soberana:**
    -   Cada participante asocia una clave pública a un identificador único (DNI electrónico, firma digital de la Seguridad Social, o acreditación sindical).
    -   La verificación se realiza mediante testigos descentralizados (otros ciudadanos, representantes sindicales) que avalan la pertenencia al censo electoral o a la plantilla de la empresa. Se utiliza un modelo de *web of trust* (como GPG) para evitar una base de datos central.
2.  **Fábrica de iniciativas:**
    -   Cualquier miembro verificado puede crear una propuesta de IPL o un pliego sindical depositando un *staking* mínimo (ETH o tokens de reputación) para evitar spam.
    -   La propuesta se publica con metadatos: texto articulado, exposición de motivos, umbral de firmas requerido, plazo.
3.  **Módulo de firmas criptográficas:**
    -   Las firmas se recogen mediante una transacción en la DAO. Cada firma es un voto inmutable y verificable.
    -   El sistema admite delegación revocable (*liquid democracy*): un firmante puede delegar su voto en un delegado para el seguimiento posterior de la iniciativa.
4.  **Contrato inteligente de seguimiento (el "alma" de la voz):**
    -   Una vez alcanzado el umbral de firmas, la iniciativa se convierte en un *NFT de voz* o un contrato autónomo que exige respuestas periódicas de la institución o la empresa.
    -   Si en un plazo dado no hay respuesta o la respuesta es negativa, el contrato puede activar automáticamente mecanismos de escalada: envío de notificaciones a los firmantes, recolección de fondos para campañas, convocatoria de una asamblea digital sincrónica o, en última instancia, un fork de la iniciativa (una nueva propuesta modificada).
5.  **Tesorería comunitaria:**
    -   La DAO puede recibir donaciones para costear la promoción de la iniciativa o la asistencia legal.
    -   Los fondos se gestionan mediante una multi-firma elegida por los firmantes, evitando tanto la apropiación por una junta como el caos sin control.
### 4.2. Distro institucional (IPL ante el gobierno)
Esta instancia particulariza el Core para el ámbito legislativo/ciudadano.
-   **Censo:** vinculado a la inscripción electoral o al DNI electrónico. Los testigos pueden ser ayuntamientos que validen a sus vecinos mediante un *oráculo* descentralizado.
-   **Umbrales:** se programan según la legislación vigente (p. ej., 500 000 firmas para una IPL estatal). El smart contract verifica el censo automáticamente si existe un oráculo oficial; mientras tanto, se usa un sistema de verificación por muestreo distribuido.
-   **Interfaz con la institución:** Una vez presentada la iniciativa, el parlamento o el gobierno recibe una dirección de contrato donde debe depositar sus informes de tramitación. La DAO emite "alertas de inacción" si no se registran actualizaciones en el plazo legal.
-   **Escalada:** si el parlamento rechaza la iniciativa, la DAO puede reconvertirse en una plataforma de referéndum no vinculante o en un espacio de redacción colaborativa de una nueva propuesta, aprendiendo de las objeciones.
### 4.3. Distro sindical (IPL de los trabajadores ante la directiva)
Esta instancia traduce el mismo núcleo al ámbito laboral.
-   **Censo:** trabajadores de una empresa o sector, verificados mediante su contrato laboral, nómina o clave de la Seguridad Social. Los delegados sindicales actúan como testigos privilegiados.
-   **Umbrales:** se definen por el número de trabajadores (p. ej., 10 % de la plantilla para iniciar una consulta, mayoría simple para una propuesta vinculante si así lo permite el convenio).
-   **Pliego sindical como contrato inteligente:** La propuesta de modificación de condiciones laborales, horarios, etc., se codifica como un texto hasheado y se vincula a un token que representa la voz colectiva.
-   **Interfaz con la empresa:** La dirección recibe una notificación automática y debe depositar su respuesta en la DAO. El silencio o el rechazo activan eventos como:
    -   Asamblea general digital (con votación delegada).
    -   Recaudación descentralizada para un fondo de resistencia.
    -   Solicitud automática de mediación a la autoridad laboral, registrada en la cadena.
-   **Prevención de represalias:** La identidad de los firmantes se mantiene seudónima ante la empresa hasta que se alcance un quórum suficiente, momento en que se revela la lista a un mediador designado, protegiendo a los trabajadores de despidos selectivos.
5\. Arquitectura tecnológica y coherencia con el directorio FOSS
----------------------------------------------------------------
-   **Cadena de bloques:** Ethereum (mainnet para seguridad final, o una L2 como Arbitrum para costes reducidos). El Core se despliega como un conjunto de smart contracts en Solidity.
-   **Almacenamiento de textos y pruebas:** IPFS para los documentos completos, con hashes registrados on-chain.
-   **Identidad:** Integración con *wallets* estándar (MetaMask, Gnosis Safe) y soporte para firmas criptográficas con GPG para los usuarios no habituados a las criptomonedas (puente entre el mundo analógico y el digital).
-   **Forja de código y gobernanza del protocolo:** Radicle o Gitea para el desarrollo del software de la HiperIPL, de modo que el propio artefacto sea FOSS y pueda ser auditado, forkado y mejorado por la comunidad.
-   **Capacidad offline:** Se diseñará una versión mínima que funcione con SMS o formularios web que generen firmas delegadas, para no excluir a los ciudadanos o trabajadores sin competencias digitales avanzadas (evitando la "aristocracia técnica" que señaló el profesor).
6\. Conclusiones y alineamiento con el marco teórico
----------------------------------------------------
HiperIPL no es una utopía digital; es una extensión natural de la asamblea analógica que hereda, transformadas, las tensiones de la oikonomía cristiana:
-   Conserva el anhelo de *pleroma* (una voz que alcanza plenitud sin ser silenciada).
-   Impone una *kenosis* técnica: la autoridad del validador se vacía en el consenso de la red.
-   Evita el centralismo romano (un ministerio que archiva) y la fragmentación babélica (firmas que nunca convergen) mediante un protocolo que permite la autocefalía de las iniciativas y el fork como derecho de reforma.
Frente a Rallo, la HiperIPL demuestra que el valor de una demanda colectiva no se reduce a preferencias subjetivas agregadas por el mercado; es una construcción social que adquiere fuerza vinculante al formalizarse en un libro mayor compartido. Frente a Marx, el instrumento no elimina la lucha de clases, pero desplaza el campo de batalla: no se requiere la toma del Estado, sino la construcción de una máquina de voz que la patronal o el gobierno no pueden ignorar porque su inacción queda registrada y expuesta. La plusvalía informacional de la firma no se la apropia un burócrata ni un líder sindical; pertenece a la DAO.
7\. Solicitud de tutoría y fases propuestas
-------------------------------------------
Solicito que este proyecto sea acogido como trabajo de curso y, si el profesor lo considera viable, que se establezca un plan de tutorías para:
1.  **Fase 1 -- Especificación funcional y jurídica** (análisis de la legislación de IPL y de los derechos sindicales, definición de requisitos).
2.  **Fase 2 -- Diseño técnico y prototipo** (selección de red, desarrollo de smart contracts, pruebas de concepto en testnet).
3.  **Fase 3 -- Piloto con una comunidad real** (por ejemplo, una IPL de ámbito local o un comité de empresa dispuesto a experimentar).
4.  **Fase 4 -- Publicación del código y documentación** bajo licencia FOSS, contribuyendo a la hiperplaza común.
* * * * *
El artefacto queda así formulado. La hiperextensión de la IPL no es solo un proyecto técnico; es una respuesta a la derrota del ala jacobina que su profesor lamentaba: una tentativa de reconstruir la asamblea de la virtud con herramientas que no dependen de la benevolencia del poder, sino de la inmutabilidad de un libro mayor compartido. ¿Podrá volar esta vez sin ser derribada? Eso depende, quizá, de que la plaza digital no olvide que el *Logos* que la habita debe algo a la gratuidad y al don, y no solo al consenso algorítmico.
