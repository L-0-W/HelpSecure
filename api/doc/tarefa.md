SER O MAIS SIMPLES POSSIVEL - EM RUST

TER ENDPOINST PARA:

- receberIP - Esse endpoint vai ser GET, vai ter 1 parametro cam_ip e token de autorização.

esse endpoint vai servir para que a camera ESP mande uma requisição e “cadastrar“ seu ip



criar conta, contendo nome, email e senha; toda questão de CRUD para contas, criar, editar, exlcuir, etc..

CRUD para camera

CRUD para visitantes

CRUD para locais

banco de dados sqlite(talvez utilizando turso), no github tem a UML do banco de dados.



apos esp32 enviar ip pelo endpoint, conectar via websocket no ip e receber imagens, essa imagens vai ser enviadas via websocket para o react native



senhas hasheadas para guardar no banco de dados

logica de JWT levando em conta segurança(middleware)