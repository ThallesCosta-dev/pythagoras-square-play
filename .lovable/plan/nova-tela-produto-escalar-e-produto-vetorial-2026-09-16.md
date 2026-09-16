# Nova tela: Produto escalar e produto vetorial

## Objetivo
Adicionar uma quarta experiência interativa, em português, para comparar produto escalar e produto vetorial com dois vetores 2D.

## O que será construído
- Nova opção **Produtos** no menu superior.
- Plano cartesiano com dois vetores coloridos e pontas arrastáveis.
- Animação passo a passo do produto escalar: multiplicações por coordenada e soma final.
- Animação passo a passo do produto vetorial 2D: multiplicações cruzadas, subtração e área orientada.
- Área entre os vetores preenchida para representar visualmente o módulo do produto vetorial.
- Controle deslizante de velocidade, além de reproduzir/pausar e reiniciar.
- Cores distintas e consistentes para cada vetor, coordenada e resultado.
- Layout adaptado para telas grandes e celulares, mantendo o estilo atual.

## Detalhes técnicos
- Criar a rota `/produtos-vetoriais` com metadados próprios.
- Usar SVG e eventos de ponteiro para o desenho e a interação.
- Implementar a sequência animada localmente, sem armazenamento ou serviços externos.
- Atualizar somente a navegação compartilhada e a nova tela.
- Validar navegação, arraste, animação e controle de velocidade no navegador.
