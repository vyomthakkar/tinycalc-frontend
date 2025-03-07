use wasm_bindgen::prelude::*;

/* Public API (to js) for the calculator
    Input: A string representing a mathematical expression
    Output: A f64 representing the result of the expression or an error message
*/
#[wasm_bindgen]
pub fn calculate(expression: &str) -> Result<i32, JsValue> {
    match evaluate_expression(expression) {
        Ok(result) => Ok(result),
        Err(err) => Err(JsValue::from_str(&format!("Error: {}", err))),
    }
}


fn evaluate_expression(expression: &str) -> Result<i32, String> {
    let mut numbers: Vec<i32> = Vec::new(); //stack for numbers
    let mut operators: Vec<char> = Vec::new(); //stack for operators
    
    let mut i = 0;
    let chars: Vec<char> = expression.chars().collect();

    while i < chars.len() {
        let c = chars[i];
        
        //skip whitespace
        if c.is_whitespace() {
            i += 1;
            continue;
        }
        
        //parse numbers

        //detect the start of a number, accumulate all of the digits of the number, and then push the number to the numbers stack
        if c.is_digit(10) {
            let mut number = 0;

            while i < chars.len() && chars[i].is_digit(10) {
                number = number * 10 + chars[i].to_digit(10).unwrap() as i32;
                i += 1;
            }

            numbers.push(number);
            continue;
        }

        //handle parentheses
        if c == '(' {
            operators.push(c);
        } else if c == ')' {
            while !operators.is_empty() && operators.last().unwrap() != &'(' { //applies all operators until the matching opening parenthesis is found, OR, the operators stack is empty
                apply_operator(&mut numbers, &mut operators)?;
            }

            if operators.is_empty() || operators.last().unwrap() != &'(' { //if operators stack is empty (no opening parenthesis matched), or the last operator in the stack is not the matching opening parenthesis, then ERROR!
                return Err("Mismatched parentheses".to_string());
            }

            operators.pop(); //remove the matching opening parenthesis from the stack
        } else if is_operator(c) {
            //first process operators with higher precedence AND if current operator is not the first operator of an opening parenthesis (in which case it should be applied immediately), only then push the current operator to the stack
            while !operators.is_empty() && 
                  operators.last().unwrap() != &'(' && 
                  precedence(operators.last().unwrap()) >= precedence(&c) {
                apply_operator(&mut numbers, &mut operators)?;
            }

            operators.push(c);
        } else {
            return Err(format!("Invalid character: {}", c));
        }

        i += 1;
    }

    //process remaining operators in the stack
    while !operators.is_empty() {
        if operators.last().unwrap() == &'(' {
            return Err("Mismatched parentheses".to_string());
        }
        apply_operator(&mut numbers, &mut operators)?;
    }
    
    if numbers.len() != 1 {
        return Err("Invalid expression".to_string());
    }
    
    Ok(numbers[0])

}

fn is_operator(c: char) -> bool {
    c == '+' || c == '-' || c == '*' || c == '/'
}

fn precedence(op: &char) -> u8 {
    match op {
        '+' | '-' => 1,
        '*' | '/' => 2,
        _ => 0,
    }
}


fn apply_operator(numbers: &mut Vec<i32>, operators: &mut Vec<char>) -> Result<(), String> {
    if numbers.len() < 2 {
        return Err("Invalid expression: not enough operands".to_string());
    }
    
    let op = operators.pop().unwrap();
    let b = numbers.pop().unwrap();
    let a = numbers.pop().unwrap();
    
    let result = match op {
        '+' => a + b,
        '-' => a - b,
        '*' => a * b,
        '/' => {
            if b == 0 {
                return Err("Division by zero".to_string());
            }
            a / b
        },
        _ => return Err(format!("Unknown operator: {}", op)),
    };
    
    numbers.push(result);
    Ok(())
}
